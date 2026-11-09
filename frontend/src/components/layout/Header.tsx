import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ROUTES } from '@/utils/constants';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/useToast';
import { BrandMark } from './BrandMark';
import { GlitchText } from '@/features/haunting/GlitchText';
import { useHauntingStore } from '@/features/haunting/hauntingStore';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAuthenticated, signOut } = useAuthStore();

  // In Haunted, "Get Started" opens the "Revisiting Companion or New Soul?" page so the visitor picks
  // between signing in and registering. Elegant has no such page and goes straight to sign-up.
  const haunted = useHauntingStore((s) => s.horrorEnabled && s.experience === 'haunted');
  const getStartedPath = haunted ? ROUTES.signIn : ROUTES.signUp;

  // Every route renders its own <PageLayout> at the same position, so React reuses this Header
  // across navigations. Close the mobile menu whenever the route changes, however it changed.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = () => {
    signOut();
    toast.success('Signed out', 'You have been successfully signed out.');
    navigate(ROUTES.home);
    setMobileMenuOpen(false);
  };

  const publicNavLinks = [
    { name: 'How It Works', path: ROUTES.howItWorks },
    { name: 'About', path: ROUTES.about },
  ];

  const authenticatedNavLinks = [
    { name: 'Design Studio', path: ROUTES.studio },
    { name: 'My Designs', path: ROUTES.gallery },
    ...publicNavLinks,
  ];

  const navLinks = isAuthenticated ? authenticatedNavLinks : publicNavLinks;

  return (
    <header className="hf-nav sticky top-0 z-40 w-full border-b border-navy-700 bg-header/95 backdrop-blur-md" data-distort="">
      <nav className="hf-nav__inner mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="hf-nav__bar flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link
              to={ROUTES.home}
              className="flex items-center gap-2 text-accent hover:text-accent-hover transition-colors"
            >
              <BrandMark />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hf-nav__links hidden md:flex md:items-center md:gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                aria-current={isActive(link.path) ? 'page' : undefined}
                className={cn(
                  'hf-nav__link text-sm font-medium transition-colors hover:text-accent-hover',
                  isActive(link.path) ? 'text-accent' : 'text-ivory/80'
                )}
              >
                <GlitchText text={link.name} />
              </Link>
            ))}
          </div>

          {/* Auth Buttons / User Menu - Desktop */}
          <div className="hf-nav__auth hidden md:flex md:items-center md:gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 text-ivory/80 px-4 py-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{user?.name}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-sm font-medium text-ivory/80 hover:text-accent-hover transition-colors px-4 py-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to={ROUTES.signIn}
                  className="hf-nav__signin text-sm font-medium text-ivory/80 hover:text-accent-hover transition-colors px-4 py-2"
                >
                  Sign In
                </Link>
                <Link
                  to={getStartedPath}
                  className="
                    hf-nav__cta
                    bg-cta hover:bg-cta-hover
                    text-on-accent font-semibold
                    px-4 py-2 rounded-md text-sm
                    transition-colors duration-200
                  "
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 text-ivory hover:text-accent-hover transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-navy-800 animate-slide-up">
            <div className="flex flex-col gap-4">
              {/* User info if authenticated */}
              {isAuthenticated && user && (
                <div className="flex items-center gap-2 text-ivory/80 py-2 border-b border-navy-800 mb-2">
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">{user.name}</span>
                </div>
              )}

              {/* Navigation links */}
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'text-base font-medium transition-colors hover:text-accent-hover py-2',
                    isActive(link.path) ? 'text-accent' : 'text-ivory/80'
                  )}
                >
                  {link.name}
                </Link>
              ))}
              
              {/* Auth buttons - mobile */}
              <div className="pt-4 border-t border-navy-800 flex flex-col gap-3">
                {isAuthenticated ? (
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-base font-medium text-ivory/80 hover:text-accent-hover transition-colors py-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                ) : (
                  <>
                    <Link
                      to={ROUTES.signIn}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-base font-medium text-ivory/80 hover:text-accent-hover transition-colors py-2"
                    >
                      Sign In
                    </Link>
                    <Link
                      to={getStartedPath}
                      onClick={() => setMobileMenuOpen(false)}
                      className="
                        bg-cta hover:bg-cta-hover
                        text-on-accent font-semibold
                        px-4 py-2 rounded-md text-base text-center
                        transition-colors duration-200
                      "
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
