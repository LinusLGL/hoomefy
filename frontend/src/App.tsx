import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ROUTES } from './utils/constants';
import PageLayout from './components/layout/PageLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ToastContainer } from './components/ui/toast';
import { useToastStore } from './hooks/useToast';
import { AuthSync } from './features/auth/AuthSync';

// Pages
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutPage from './pages/AboutPage';
import GalleryPage from './pages/GalleryPage';
import { SignUpPage } from './pages/SignUpPage';
import { SignInPage } from './pages/SignInPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { StudioPage } from './pages/StudioPage';

/**
 * Set VITE_ALLOW_GUESTS=true to let visitors use the studio without an account (saving still needs one).
 * Off by default: Design My Room then asks people to sign in first.
 */
const ALLOW_GUESTS = import.meta.env.VITE_ALLOW_GUESTS === 'true';

function RouteGuard({ open, children }: { open: boolean; children: React.ReactNode }) {
  return open ? <>{children}</> : <ProtectedRoute>{children}</ProtectedRoute>;
}

/** A new page should start at the top, not wherever the previous page was scrolled to. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  return (
    <>
      <ScrollToTop />
      <AuthSync />
      <Routes>
        {/* Public routes with layout */}
        <Route
          path={ROUTES.home}
          element={
            <PageLayout>
              <HomePage />
            </PageLayout>
          }
        />
        <Route
          path={ROUTES.howItWorks}
          element={
            <PageLayout>
              <HowItWorksPage />
            </PageLayout>
          }
        />
        <Route
          path={ROUTES.about}
          element={
            <PageLayout>
              <AboutPage />
            </PageLayout>
          }
        />

        {/* Authentication routes without layout */}
        <Route path={ROUTES.signUp} element={<SignUpPage />} />
        <Route path={ROUTES.signIn} element={<SignInPage />} />
        <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />

        {/* Protected routes */}
        <Route
          path={ROUTES.studio}
          element={
            <RouteGuard open={ALLOW_GUESTS}>
              <PageLayout>
                <StudioPage />
              </PageLayout>
            </RouteGuard>
          }
        />
        <Route
          path={ROUTES.gallery}
          element={
            <ProtectedRoute>
              <PageLayout>
                <GalleryPage />
              </PageLayout>
            </ProtectedRoute>
          }
        />

        {/* 404 - catch all */}
        <Route
          path="*"
          element={
            <PageLayout showHeader={false} showFooter={false}>
              <NotFoundPage />
            </PageLayout>
          }
        />
      </Routes>

      {/* Rendered once at the root so toasts appear on every route, including Studio and auth. */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default App;
