/**
 * Forgot Password Page
 *
 * Step 1: request a reset code by email.
 * Step 2: enter the code and a new password (the code is verified when the
 *         new password is submitted, matching how Cognito works).
 * Step 3: confirmation.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell } from '@/components/auth/AuthShell';
import { useToast } from '@/hooks/useToast';
import { authService } from '@/services';
import { validateEmail, validatePassword } from '@/utils/validation';
import { ROUTES } from '@/utils/constants';

type Step = 'email' | 'reset' | 'success';
type Field = 'email' | 'code' | 'newPassword' | 'confirmPassword';
type FormErrors = Partial<Record<Field, string>>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const sendCode = async (): Promise<boolean> => {
    if (!email) {
      setErrors({ email: 'Email is required' });
      return false;
    }
    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return false;
    }

    setErrors({});
    setIsLoading(true);
    try {
      await authService.forgotPassword({ email });
      toast.success('Reset code sent', 'Check your email for the verification code.');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset code.';
      toast.error('Something went wrong', message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await sendCode()) setStep('reset');
  };

  const handleResend = async () => {
    await sendCode();
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: FormErrors = {};
    if (!code.trim()) next.code = 'Verification code is required';
    if (!newPassword) next.newPassword = 'Password is required';
    else if (!validatePassword(newPassword)) {
      next.newPassword =
        'Password must be at least 8 characters with uppercase, lowercase, and a number';
    }
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (newPassword !== confirmPassword) next.confirmPassword = 'Passwords do not match';

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsLoading(true);
    try {
      await authService.resetPassword({ email, code: code.trim(), newPassword });
      toast.success('Password reset', 'Your password has been reset.');
      setStep('success');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'The code is incorrect or has expired.';
      toast.error('Reset failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <AuthShell
        icon={<CheckCircle2 className="w-12 h-12 text-green-500" />}
        title="Password Reset Complete"
        description="You can now sign in with your new password."
      >
        <Button className="w-full" onClick={() => navigate(ROUTES.signIn, { state: { returning: true } })}>
          Sign In
        </Button>
      </AuthShell>
    );
  }

  if (step === 'reset') {
    return (
      <AuthShell
        icon={<Mail className="w-12 h-12 text-accent" />}
        title="Create New Password"
        description={
          <>
            Enter the code we sent to <strong className="text-ivory">{email}</strong>
          </>
        }
      >
        <form onSubmit={handleResetSubmit} className="space-y-4" noValidate>
          <Input
            label="Verification Code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setErrors((prev) => ({ ...prev, code: undefined }));
            }}
            error={errors.code}
            disabled={isLoading}
          />

          <Input
            label="New Password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setErrors((prev) => ({ ...prev, newPassword: undefined }));
            }}
            error={errors.newPassword}
            helperText="At least 8 characters with uppercase, lowercase, and a number"
            disabled={isLoading}
          />

          <Input
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            error={errors.confirmPassword}
            disabled={isLoading}
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading}
              className="text-accent hover:text-accent-hover font-medium disabled:opacity-50"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => {
                setErrors({});
                setStep('email');
              }}
              className="text-ivory/70 hover:text-ivory"
            >
              Use a different email
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset Your Password"
      description="Enter your email and we'll send you a verification code"
    >
      <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
        <Input
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors({});
          }}
          error={errors.email}
          disabled={isLoading}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {isLoading ? 'Sending code...' : 'Send Reset Code'}
        </Button>

        <Link
          to={ROUTES.signIn}
          state={{ returning: true }}
          className="flex items-center justify-center gap-2 text-sm text-ivory/70 hover:text-ivory"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </form>
    </AuthShell>
  );
}
