import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Module-level flags — must be module-level (not store state) so they are
// set synchronously and visible to a second StrictMode call before any await.
let _authSubscription = null;
let _visibilityHandler = null;
let _initializing = false;  // synchronous guard — prevents StrictMode double-invoke race

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  tenant: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    // Guard against double-initialization. React StrictMode calls effects twice
    // in dev. Using a module-level sync flag blocks the second call immediately,
    // before any await — the previous store-state guard was too late.
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

      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // STALE SESSION FIX: Supabase refreshed the JWT (e.g. after a suspended tab
        // wakes up). If the profile was cleared during the idle period, reload it.
        // If profile is already set, this is a noop — no unnecessary re-fetch.
        if (!get().profile) {
          await get().loadProfile(session.user);
        } else {
          // Still update the user reference so the new JWT is reflected everywhere
          set({ user: session.user });
        }

      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, tenant: null });
      }
    });

    _authSubscription = subscription;

    // STALE SESSION FIX: When the tab returns from the background, the browser
    // may have suspended JS timers and Supabase's proactive token refresh may have
    // missed its window. On visibility change we re-check the session so that
    // any navigation the user makes immediately after will have a valid token.
    if (_visibilityHandler) {
      document.removeEventListener('visibilitychange', _visibilityHandler);
    }
    _visibilityHandler = async () => {
      if (document.visibilityState !== 'visible') return;
      await get().checkSession();
    };
    document.addEventListener('visibilitychange', _visibilityHandler);
  },

  // STALE SESSION FIX: Single entry-point for session validation.
  // Called on tab focus and on every navigation from DashboardLayout.
  //   - Session valid   + profile set   → noop (fast path, no network call)
  //   - Session valid   + profile null  → reload profile (sets loading: true during fetch)
  //   - Session expired                 → clear state (ProtectedRoute will redirect to /login)
  checkSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        if (!get().profile) {
          // Profile was wiped during idle — reload it. Setting loading: true prevents
          // DashboardLayout from rendering child pages until the profile is back.
          set({ loading: true });
          await get().loadProfile(session.user);
        }
        // If profile exists, session is fine — nothing to do.
        return true;
      } else {
        // No valid session — sign out cleanly so ProtectedRoute redirects to /login.
        // Avoid calling supabase.auth.signOut() here because the session is already
        // gone; just clear the local store state.
        set({ user: null, profile: null, tenant: null, loading: false });
        return false;
      }
    } catch (err) {
      console.error('Session check error:', err);
      return false;
    }
  },

  loadProfile: async (user) => {
    try {
      // Retry once on transient failure — if the profile fetch fails, pages that
      // gate their data load on profile?.id never fire, showing blank forever.
      let profile, profileErr;
      for (let attempt = 0; attempt < 2; attempt++) {
        ({ data: profile, error: profileErr } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single());
        if (!profileErr) break;
        if (attempt === 0) await new Promise(r => setTimeout(r, 800));
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
