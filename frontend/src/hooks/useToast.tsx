import { useMemo } from 'react';
import { create } from 'zustand';
import type { Toast, ToastType } from '@/components/ui/toast';

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id: Math.random().toString(36).substr(2, 9),
        },
      ],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

export const useToast = () => {
  const addToast = useToastStore((state) => state.addToast);

  // Memoized so the returned object is stable across renders and safe to
  // use in hook dependency arrays.
  return useMemo(
    () => ({
      success: (title: string, description?: string) => {
        addToast({ type: 'success', title, description });
      },
      error: (title: string, description?: string) => {
        addToast({ type: 'error', title, description });
      },
      info: (title: string, description?: string) => {
        addToast({ type: 'info', title, description });
      },
      warning: (title: string, description?: string) => {
        addToast({ type: 'warning', title, description });
      },
      custom: (type: ToastType, title: string, description?: string, duration?: number) => {
        addToast({ type, title, description, duration });
      },
    }),
    [addToast]
  );
};
