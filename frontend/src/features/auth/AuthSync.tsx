/**
 * Keeps the auth store in step with the Supabase session: restores it on load, follows sign-in and
 * sign-out (including from another tab), and picks up refreshed tokens. Renders nothing, and does
 * nothing when the site is not connected to a Supabase project.
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toTokens, toUser } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';

export function AuthSync() {
  useEffect(() => {
    if (!supabase) return undefined;
    const client = supabase;
    const store = useAuthStore.getState;

    void client.auth.getSession().then(({ data }) => {
      if (data.session) {
        store().setUser(toUser(data.session.user));
        store().setTokens(toTokens(data.session));
      } else if (store().isAuthenticated) {
        // A stale session from simulated sign-in or an expired login.
        store().clearSession();
      }
    });

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (session) {
        store().setUser(toUser(session.user));
        store().setTokens(toTokens(session));
      } else if (event === 'SIGNED_OUT') {
        store().clearSession();
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return null;
}
