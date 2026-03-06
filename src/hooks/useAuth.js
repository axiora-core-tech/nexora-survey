import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  tenant: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await get().loadProfile(session.user);
      }
    } catch (err) {
      console.error('Auth init error:', err);
    } finally {
      set({ loading: false, initialized: true });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await get().loadProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, tenant: null });
      }
    });
  },

  loadProfile: async (user) => {
    try {
      const { data: profile, error: profileErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileErr) throw profileErr;

      let tenant = null;
      if (profile?.tenant_id) {
        const { data: t } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profile.tenant_id)
          .single();
        tenant = t;
      }

      set({ user, profile, tenant, loading: false });
    } catch (err) {
      console.error('Profile load error:', err);
      set({ user, profile: null, tenant: null, loading: false });
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      await get().loadProfile(data.user);
    }
    return data;
  },

  signUp: async (email, password, tenantName, tenantSlug, fullName) => {
    // 1. Create auth user (or get existing unconfirmed user)
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, tenant_name: tenantName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (authErr) throw authErr;
    if (!authData.user) throw new Error('Sign up failed. Please try again.');

    // Check if email confirmation is required
    const needsConfirmation = authData.user && !authData.session;

    // 2. Register tenant via server function
    // The function will verify the real user ID from auth.users (not trusting frontend)
    const res = await fetch('/.netlify/functions/register-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: authData.user.id,
        email,
        fullName,
        tenantName,
        tenantSlug,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Failed to create organization');
    }

    // 3. If user already had an org (re-registration), just load their profile
    if (result.existing) {
      if (authData.session && authData.user) {
        await get().loadProfile(authData.user);
      }
      return { ...authData, needsConfirmation, existing: true, message: result.message };
    }

    // 4. Fresh registration — load profile if session is available
    if (authData.session && authData.user) {
      await get().loadProfile(authData.user);
    }

    return { ...authData, needsConfirmation };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, tenant: null });
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return;
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();
    if (error) throw error;
    set({ profile: data });
    return data;
  },
}));

export default useAuthStore;
