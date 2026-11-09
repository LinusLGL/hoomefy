import * as React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastProps extends Toast {
  onDismiss: (id: string) => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
};

const styles: Record<ToastType, string> = {
  success: 'bg-success/10 border-success text-success',
  error: 'bg-danger/10 border-danger text-danger',
  info: 'bg-info/10 border-info text-info',
  warning: 'bg-warning/10 border-warning text-warning',
};

export const ToastComponent: React.FC<ToastProps> = ({
  id,
  type,
  title,
  description,
  duration = 5000,
  onDismiss,
}) => {
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [id, duration, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-2',
        'shadow-lg backdrop-blur-sm',
        'animate-slide-up',
        styles[type]
      )}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ivory">{title}</p>
        {description && <p className="text-sm text-ivory/70 mt-1">{description}</p>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 text-ivory/75 hover:text-ivory transition-colors p-1 rounded-md hover:bg-ivory/10"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-md pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastComponent {...toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};
