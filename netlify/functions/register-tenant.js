import { createClient } from '@supabase/supabase-js';

// Admin client with service role key (bypasses RLS)
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
    const { userId, email, fullName, tenantName, tenantSlug } = JSON.parse(event.body);

    if (!userId || !email || !tenantName || !tenantSlug) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Validate slug
    if (!/^[a-z0-9-]{3,50}$/.test(tenantSlug)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid organization URL. Use lowercase letters, numbers, and hyphens.' }) };
    }

    const supabase = getAdminClient();

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single();

    if (existing) {
      return { statusCode: 409, body: JSON.stringify({ error: 'Organization URL already taken' }) };
    }

    // Use the register_tenant function
    const { data, error } = await supabase.rpc('register_tenant', {
      p_tenant_name: tenantName,
      p_tenant_slug: tenantSlug,
      p_user_id: userId,
      p_user_email: email,
      p_user_name: fullName || email.split('@')[0],
    });

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ tenantId: data, message: 'Organization created successfully' }),
    };
  } catch (err) {
    console.error('Register tenant error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Failed to create organization' }),
    };
  }
}
