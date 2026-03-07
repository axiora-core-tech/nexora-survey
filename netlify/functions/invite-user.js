import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  '';

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function getAdminClient() {
  if (!SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL not configured. Set VITE_SUPABASE_URL or SUPABASE_URL in Netlify Environment Variables.'
    );
  }
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY not configured. Set SUPABASE_SERVICE_ROLE_KEY in Netlify Environment Variables.'
    );
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { email, role, fullName, tenantId, invitedBy } = JSON.parse(
      event.body || '{}'
    );

    if (!email || !tenantId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Email and tenant ID are required' }),
      };
    }

    const validRoles = ['viewer', 'creator', 'manager', 'admin'];
    if (role && !validRoles.includes(role)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid role' }),
      };
    }

    const supabase = getAdminClient();

    // Verify tenant exists
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .maybeSingle();

    if (!tenant) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Organization not found' }),
      };
    }

    // SECURITY FIX: invitedBy was optional — omitting it entirely bypassed the
    // permission check, letting anyone who knew a tenantId invite users to it.
    // Now required; request is rejected if not supplied.
    if (!invitedBy) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'invitedBy is required' }),
      };
    }

    const { data: inviter } = await supabase
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', invitedBy)
      .maybeSingle();

    if (
      !inviter ||
      inviter.tenant_id !== tenantId ||
      !['super_admin', 'admin'].includes(inviter.role)
    ) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'You do not have permission to invite users' }),
      };
    }

    // Check if user already exists in this tenant
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingProfile) {
      return {
        statusCode: 409,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'User already belongs to this organization' }),
      };
    }

    // Create auth user via Supabase Admin API (sends invite email)
    const { data: authUser, error: authErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { tenant_id: tenantId, full_name: fullName },
    });

    if (authErr) {
      // If user already exists in auth, just create the profile link
      if (authErr.message?.includes('already registered') || authErr.message?.includes('already been registered')) {
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
            headers: CORS_HEADERS,
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

    // Log audit event
    if (invitedBy) {
      await supabase.from('audit_log').insert({
        tenant_id: tenantId,
        user_id: invitedBy,
        action: 'invite_user',
        resource_type: 'user',
        resource_id: authUser.user.id,
        details: { email, role },
      });
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: `Invitation sent to ${email}` }),
    };
  } catch (err) {
    console.error('Invite user error:', err);

    const statusCode = err.message?.includes('not configured') ? 503 : 500;

    return {
      statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: err.message || 'Failed to invite user',
      }),
    };
  }
}
