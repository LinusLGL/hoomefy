/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication.
 * Redirects to sign-in page if user is not authenticated.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to sign-in with return URL
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
