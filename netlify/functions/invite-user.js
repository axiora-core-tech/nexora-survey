import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email, role, fullName, tenantId, invitedBy } = JSON.parse(event.body);

    if (!email || !tenantId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email and tenant ID required' }) };
    }

    const validRoles = ['viewer', 'creator', 'manager', 'admin'];
    if (role && !validRoles.includes(role)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid role' }) };
    }

    const supabase = getAdminClient();

    // Verify tenant exists
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Organization not found' }) };
    }

    // Verify inviter has permission (is admin in same tenant)
    if (invitedBy) {
      const { data: inviter } = await supabase
        .from('user_profiles')
        .select('role, tenant_id')
        .eq('id', invitedBy)
        .single();

      if (!inviter || inviter.tenant_id !== tenantId || !['super_admin', 'admin'].includes(inviter.role)) {
        return { statusCode: 403, body: JSON.stringify({ error: 'You do not have permission to invite users' }) };
      }
    }

    // Check if user already exists in this tenant
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .single();

    if (existingProfile) {
      return { statusCode: 409, body: JSON.stringify({ error: 'User already belongs to this organization' }) };
    }

    // Create auth user via Supabase Admin API (sends invite email)
    const { data: authUser, error: authErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { tenant_id: tenantId, full_name: fullName },
    });

    if (authErr) {
      // If user already exists in auth, just create the profile
      if (authErr.message?.includes('already registered')) {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existingUser = users?.find((u) => u.email === email);
        if (existingUser) {
          const { error: profileErr } = await supabase
            .from('user_profiles')
            .insert({
              id: existingUser.id,
              tenant_id: tenantId,
              email,
              full_name: fullName || email.split('@')[0],
              role: role || 'viewer',
            });
          if (profileErr) throw profileErr;

          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'User added to organization' }),
          };
        }
      }
      throw authErr;
    }

    // Create user profile
    const { error: profileErr } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        tenant_id: tenantId,
        email,
        full_name: fullName || email.split('@')[0],
        role: role || 'viewer',
      });

    if (profileErr) throw profileErr;

    // Log audit
    await supabase.from('audit_log').insert({
      tenant_id: tenantId,
      user_id: invitedBy,
      action: 'invite_user',
      resource_type: 'user',
      resource_id: authUser.user.id,
      details: { email, role },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Invitation sent to ${email}` }),
    };
  } catch (err) {
    console.error('Invite user error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Failed to invite user' }),
    };
  }
}
