/**
 * Sign Up Page
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandMark } from '@/components/layout/BrandMark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell } from '@/components/auth/AuthShell';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services';
import { validateEmail, validatePassword } from '@/utils/validation';
import { ROUTES } from '@/utils/constants';

type Field = 'name' | 'email' | 'password' | 'confirmPassword';
type FormErrors = Partial<Record<Field, string>>;

export function SignUpPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);

  const [form, setForm] = useState<Record<Field, string>>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleChange = (field: Field, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const next: FormErrors = {};

    if (!form.name.trim()) next.name = 'Name is required';
    else if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters';

    if (!form.email) next.email = 'Email is required';
    else if (!validateEmail(form.email)) next.email = 'Please enter a valid email address';

    if (!form.password) next.password = 'Password is required';
    else if (!validatePassword(form.password)) {
      next.password =
        'Password must be at least 8 characters with uppercase, lowercase, and a number';
    }

    if (!form.confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const result = await authService.signUp({
        name: form.name.trim(),
        email: form.email,
        password: form.password,
      });
      if (result.signedIn) {
        // The project does not require email confirmation, so the new account can start straight away.
        const { user, tokens } = await authService.signIn({ email: form.email, password: form.password });
        setUser(user);
        setTokens(tokens);
        toast.success('Welcome!', 'Your account is ready.');
        navigate(ROUTES.studio, { replace: true });
        return;
      }
      setVerificationSent(true);
      toast.success('Account created!', 'Please check your email to verify your account.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      toast.error('Registration failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <AuthShell
        tone="soul"
        icon={<BrandMark iconOnly iconClassName="w-12 h-12 text-accent" />}
        title="Check Your Email"
        description={
          <>
            We&apos;ve sent a verification link to{' '}
            <strong className="text-ivory">{form.email}</strong>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-ivory/70 text-center">
            Click the link in the email to verify your account. Check your spam folder if you
            don&apos;t see it.
          </p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate(ROUTES.signIn, { state: { returning: true } })}
          >
            Go to Sign In
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      tone="soul"
      icon={<BrandMark iconOnly iconClassName="w-12 h-12 text-accent" />}
      title="Create Your Account"
      description="Join Hoomefy and start transforming your space"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full Name"
          autoComplete="name"
          placeholder="Jane Doe"
          value={form.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={errors.name}
          disabled={isLoading}
        />

        <Input
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          disabled={isLoading}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => handleChange('password', e.target.value)}
          error={errors.password}
          helperText="At least 8 characters with uppercase, lowercase, and a number"
          disabled={isLoading}
        />

        <Input
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={(e) => handleChange('confirmPassword', e.target.value)}
          error={errors.confirmPassword}
          disabled={isLoading}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>

        <p className="text-sm text-ivory/70 text-center">
          Already have an account?{' '}
          <Link to={ROUTES.signIn} state={{ returning: true }} className="text-accent hover:text-accent-hover font-medium">
            Sign In
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
