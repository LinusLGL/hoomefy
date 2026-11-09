import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tokens } from '@/types';
import { STORAGE_KEYS } from '@/utils/constants';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: Tokens | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  /** Signs out of the server session and clears local state. */
  signOut: () => void;
  /** Clears local state only, for when the server session has already ended. */
  clearSession: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          error: null,
        }),

      setTokens: (tokens) =>
        set({
          tokens,
          isAuthenticated: !!(tokens && get().user),
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      signOut: () => {
        // Ends the Supabase session too; the local state is cleared straight away so the UI never waits.
        void supabase?.auth.signOut().catch(() => undefined);
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearSession: () =>
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        }),

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },
    }),
    {
      name: STORAGE_KEYS.tokens,
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors for common use cases
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
