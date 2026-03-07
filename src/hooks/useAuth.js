import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Module-level flags — both must be module-level (not store state) so they are
// set synchronously and visible to a second StrictMode call before any await.
let _authSubscription = null;
let _initializing = false;  // synchronous guard — prevents StrictMode double-invoke race

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  tenant: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    // BUG FIX (updated): The previous guard checked get().initialized which is set
    // in a finally block after async work — too late to block a StrictMode second call
    // that arrives while the first is still awaiting getSession().
    // Using a module-level sync flag instead blocks the second call immediately.
    if (_initializing || get().initialized) return;
    _initializing = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await get().loadProfile(session.user);
      }
    } catch (err) {
      console.error('Auth init error:', err);
    } finally {
      set({ loading: false, initialized: true });
      _initializing = false;
    }

    // Tear down any stale subscription before creating a fresh one
    if (_authSubscription) {
      _authSubscription.unsubscribe();
      _authSubscription = null;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await get().loadProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, tenant: null });
      }
    });

    _authSubscription = subscription;
  },

  loadProfile: async (user) => {
    try {
      // BUG FIX: Added retry — if the profile fetch fails transiently (e.g. network
      // hiccup on startup), pages that gate their data load on profile?.id would
      // never fire because user was set but profile remained null.
      let profile, profileErr;
      for (let attempt = 0; attempt < 2; attempt++) {
        ({ data: profile, error: profileErr } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single());
        if (!profileErr) break;
        if (attempt === 0) await new Promise(r => setTimeout(r, 800)); // brief pause before retry
      }

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
    if (data.user) await get().loadProfile(data.user);
    return data;
  },

  signUp: async (email, password, tenantName, tenantSlug, fullName) => {
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

    const needsConfirmation = authData.user && !authData.session;

    const res = await fetch('/.netlify/functions/register-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: authData.user.id, email, fullName, tenantName, tenantSlug }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create organization');

    if (result.existing) {
      if (authData.session && authData.user) await get().loadProfile(authData.user);
      return { ...authData, needsConfirmation, existing: true, message: result.message };
    }

    if (authData.session && authData.user) await get().loadProfile(authData.user);
    return { ...authData, needsConfirmation };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, tenant: null });
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) throw new Error('Profile not loaded. Please refresh the page.');

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Update had no effect. Your session may have expired — try logging out and back in.');

    set({ profile: data });
    return data;
  },

  // BUG FIX: New method — Settings was updating Supabase directly but never
  // syncing back to the Zustand store, so the nav header showed a stale org name.
  updateTenant: async (updates) => {
    const { tenant } = get();
    if (!tenant) throw new Error('Organisation not loaded.');

    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenant.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Update had no effect.');

    set({ tenant: data });
    return data;
  },
}));

export default useAuthStore;
