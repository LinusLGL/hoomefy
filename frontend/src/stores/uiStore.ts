/**
 * UI Store - Global UI State Management
 * 
 * Manages application-wide UI state including:
 * - Haunted mode toggle
 * - Theme preferences
 * - Loading states
 * - Mobile menu state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface UIState {
  // Haunted mode
  isHauntedMode: boolean;
  setHauntedMode: (enabled: boolean) => void;
  toggleHauntedMode: () => void;
  
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Mobile menu
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  
  // Global loading
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  
  // Modal state
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  
  // User preferences
  prefersReducedMotion: boolean;
  setPrefersReducedMotion: (value: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Haunted mode - default enabled for that spooky experience
      isHauntedMode: true,
      setHauntedMode: (enabled) => set({ isHauntedMode: enabled }),
      toggleHauntedMode: () =>
        set((state) => ({ isHauntedMode: !state.isHauntedMode })),
      
      // Theme - default dark
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      
      // Mobile menu
      isMobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
      toggleMobileMenu: () =>
        set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
      
      // Global loading
      isGlobalLoading: false,
      setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),
      
      // Modal state
      activeModal: null,
      openModal: (modalId) => set({ activeModal: modalId }),
      closeModal: () => set({ activeModal: null }),
      
      // Motion preferences - detect from system
      prefersReducedMotion:
        typeof window !== 'undefined'
          ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
          : false,
      setPrefersReducedMotion: (value) => set({ prefersReducedMotion: value }),
    }),
    {
      name: 'hoomefy-ui-storage',
      // Only persist these fields
      partialize: (state) => ({
        isHauntedMode: state.isHauntedMode,
        theme: state.theme,
        prefersReducedMotion: state.prefersReducedMotion,
      }),
    }
  )
);

// Detect prefers-reduced-motion changes
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', (e) => {
    useUIStore.getState().setPrefersReducedMotion(e.matches);
  });
}
