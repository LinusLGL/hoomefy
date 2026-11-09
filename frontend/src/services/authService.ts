/**
 * Authentication Service
 *
 * Real accounts through Supabase Auth when the site is connected to a Supabase project
 * (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY). Without one (local development and the automated
 * tests) sign-in is simulated so every screen can still be used.
 */

import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { User, Tokens } from '@/types';
import { STORAGE_KEYS } from '@/utils/constants';
import { supabase } from '@/lib/supabase';

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface ConfirmSignUpRequest {
  email: string;
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

export interface SignUpResult {
  /** True when the account is already signed in (the project does not require email confirmation). */
  signedIn: boolean;
}

export function toUser(u: SupabaseUser): User {
  const meta = (u.user_metadata ?? {}) as { name?: unknown };
  return {
    userId: u.id,
    email: u.email ?? '',
    name: typeof meta.name === 'string' && meta.name ? meta.name : (u.email ?? '').split('@')[0],
    hauntedModeEnabled: true,
    createdAt: u.created_at,
  };
}

export function toTokens(s: Session): Tokens {
  return {
    idToken: s.access_token,
    accessToken: s.access_token,
    refreshToken: s.refresh_token,
    expiresAt: (s.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000,
  };
}

/** Turns Supabase's error text into the plain wording shown to people. */
export function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'That email and password do not match.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first, then sign in.';
  if (/already registered|already been registered/i.test(message)) return 'An account with this email already exists. Try signing in.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a few minutes and try again.';
  if (/token has expired|invalid.*(token|otp)|otp.*expired/i.test(message)) return 'That code is incorrect or has expired.';
  if (/password.*(weak|short|least)/i.test(message)) return 'Choose a stronger password (8 or more characters).';
  return message;
}

class AuthService {
  async signUp(data: SignUpRequest): Promise<SignUpResult> {
    if (supabase) {
      const { data: res, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { name: data.name }, emailRedirectTo: `${window.location.origin}/signin` },
      });
      if (error) throw new Error(friendlyAuthError(error.message));
      // An address that is already registered comes back with no identities and no error.
      if (res.user && res.user.identities && res.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Try signing in.');
      }
      return { signedIn: Boolean(res.session) };
    }
    await this.delay(1500);
    return { signedIn: false };
  }

  async confirmSignUp(data: ConfirmSignUpRequest): Promise<void> {
    if (supabase) {
      const { error } = await supabase.auth.verifyOtp({ email: data.email, token: data.code, type: 'signup' });
      if (error) throw new Error(friendlyAuthError(error.message));
      return;
    }
    await this.delay(1000);
  }

  async resendConfirmationCode(email: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw new Error(friendlyAuthError(error.message));
      return;
    }
    await this.delay(1000);
  }

  async signIn(data: SignInRequest): Promise<AuthResponse> {
    if (supabase) {
      const { data: res, error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (error || !res.session) throw new Error(friendlyAuthError(error?.message ?? 'Sign in failed.'));
      return { user: toUser(res.user), tokens: toTokens(res.session) };
    }

    await this.delay(1500);
    const mockUser: User = {
      userId: `user-${Date.now()}`,
      email: data.email,
      name: data.email.split('@')[0],
      hauntedModeEnabled: true,
      createdAt: new Date().toISOString(),
    };
    const mockTokens: Tokens = {
      idToken: `mock-id-token-${Date.now()}`,
      accessToken: `mock-access-token-${Date.now()}`,
      refreshToken: `mock-refresh-token-${Date.now()}`,
      expiresAt: Date.now() + 3600000, // 1 hour
    };
    return { user: mockUser, tokens: mockTokens };
  }

  async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
      return;
    }
    await this.delay(100);
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, { redirectTo: `${window.location.origin}/signin` });
      if (error) throw new Error(friendlyAuthError(error.message));
      return;
    }
    await this.delay(1500);
  }

  /** Checks the emailed code, sets the new password, then signs out so the person signs in with it. */
  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    if (supabase) {
      const { error } = await supabase.auth.verifyOtp({ email: data.email, token: data.code, type: 'recovery' });
      if (error) throw new Error(friendlyAuthError(error.message));
      const { error: updateError } = await supabase.auth.updateUser({ password: data.newPassword });
      if (updateError) throw new Error(friendlyAuthError(updateError.message));
      await supabase.auth.signOut();
      return;
    }
    await this.delay(1500);
  }

  async refreshTokens(): Promise<Tokens> {
    if (supabase) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) throw new Error('Your session has ended. Please sign in again.');
      return toTokens(data.session);
    }
    await this.delay(100);
    return {
      idToken: `mock-id-token-${Date.now()}`,
      accessToken: `mock-access-token-${Date.now()}`,
      refreshToken: `mock-refresh-token-${Date.now()}`,
      expiresAt: Date.now() + 3600000,
    };
  }

  async getCurrentUser(): Promise<User> {
    if (supabase) {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error('No authenticated user');
      return toUser(data.user);
    }
    const storedTokens = localStorage.getItem(STORAGE_KEYS.tokens);
    if (storedTokens) {
      const { state } = JSON.parse(storedTokens);
      if (state?.user) return state.user;
    }
    throw new Error('No authenticated user');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const authService = new AuthService();
