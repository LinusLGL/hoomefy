/**
 * Sign In Page
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BrandMark } from '@/components/layout/BrandMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell } from '@/components/auth/AuthShell';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services';
import { validateEmail } from '@/utils/validation';
import { ROUTES } from '@/utils/constants';
import { HauntedAuthGate } from '@/features/haunting/HauntedAuthGate';
import { useHauntingStore } from '@/features/haunting/hauntingStore';

type FormErrors = Partial<Record<'email' | 'password', string>>;

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Haunted only: ask first whether the visitor is a returning companion or a new soul. That includes
  // someone sent here by "Design My Room" or a protected page (`from`), who still has to choose between
  // signing in and registering. Only a visitor who has plainly answered already (`returning`, set by
  // the sign-up and password pages) goes straight to the form.
  const haunted = useHauntingStore((s) => s.horrorEnabled && s.experience === 'haunted');
  const routeState = location.state as { from?: { pathname?: string }; returning?: boolean } | null;
  const [isReturning, setIsReturning] = useState(!!routeState?.returning);

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!email) next.email = 'Email is required';
    else if (!validateEmail(email)) next.email = 'Please enter a valid email address';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { user, tokens } = await authService.signIn({ email, password });
      // User must be set first: setTokens derives isAuthenticated from it.
      setUser(user);
      setTokens(tokens);

      toast.success('Welcome back!', 'You have successfully signed in.');

      const from =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ??
        ROUTES.studio;
      navigate(from, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password. Please try again.';
      toast.error('Sign in failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (haunted && !isReturning) {
    return <HauntedAuthGate onReturning={() => setIsReturning(true)} />;
  }

  return (
    <AuthShell
      icon={<BrandMark iconOnly iconClassName="w-12 h-12 text-accent" />}
      title="Welcome Back"
      description="Sign in to continue your design journey"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={isLoading}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={isLoading}
        />

        <div className="text-right">
          <Link
            to={ROUTES.forgotPassword}
            className="text-sm text-accent hover:text-accent-hover font-medium"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>

        {haunted && (
          <button
            type="button"
            className="hf-auth__back block w-full text-center text-sm text-accent hover:text-accent-hover"
            onClick={() => setIsReturning(false)}
          >
            Not a returning companion? Go back
          </button>
        )}

        <p className="text-sm text-ivory/70 text-center">
          Don&apos;t have an account?{' '}
          <Link to={ROUTES.signUp} className="text-accent hover:text-accent-hover font-medium">
            Sign Up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
