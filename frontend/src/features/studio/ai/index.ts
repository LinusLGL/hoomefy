/**
 * Chooses which provider the studio uses and holds the two small pieces of visitor state it needs:
 * the consent to send a photo to Hugging Face, and an optional Hugging Face token.
 *
 * Production builds use the real model. Local development and the automated tests use the demo
 * renderer unless VITE_AI_PROVIDER=live is set, so a test run never spends anyone's free GPU time.
 */

import { createGradioProvider, DEFAULT_SPACE } from './gradioProvider';
import { createMockProvider } from './mockProvider';
import { AiError, type EditRequest, type EditResult, type ImageEditProvider } from './types';

export * from './types';
export { classifyGradioError, createGradioProvider, DEFAULT_SPACE } from './gradioProvider';
export { createMockProvider } from './mockProvider';

export const HF_TOKEN_KEY = 'hoomefy_hf_token';
export const AI_CONSENT_KEY = 'hoomefy_ai_consent_v1';

export type ProviderMode = 'live' | 'demo';

export function getProviderMode(): ProviderMode {
  const setting = import.meta.env.VITE_AI_PROVIDER as string | undefined;
  if (setting === 'live') return 'live';
  if (setting === 'mock' || setting === 'demo') return 'demo';
  return import.meta.env.PROD ? 'live' : 'demo';
}

// ---- Hugging Face token (kept for this tab only) ----

export function getHfToken(): string | null {
  try {
    return sessionStorage.getItem(HF_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setHfToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(HF_TOKEN_KEY, token.trim());
    else sessionStorage.removeItem(HF_TOKEN_KEY);
  } catch {
    // storage unavailable: the token simply is not remembered
  }
}

export const isValidHfToken = (token: string): boolean => /^hf_[A-Za-z0-9]{20,}$/.test(token.trim());

// ---- Consent to send the photograph to Hugging Face ----

export function hasAiConsent(): boolean {
  try {
    return localStorage.getItem(AI_CONSENT_KEY) === 'yes';
  } catch {
    return false;
  }
}

export function grantAiConsent(): void {
  try {
    localStorage.setItem(AI_CONSENT_KEY, 'yes');
  } catch {
    // not remembered; the visitor is asked again next time
  }
}

// ---- Providers ----

/** Tries each provider in turn when one is down or busy. Running out of free GPU time ends the attempt: it is shared by every Space. */
export function createChainProvider(providers: ImageEditProvider[]): ImageEditProvider {
  if (providers.length === 1) return providers[0];
  return {
    id: providers.map((p) => p.id).join('>'),
    label: providers[0].label,
    sendsPhoto: providers.some((p) => p.sendsPhoto),
    async edit(request: EditRequest): Promise<EditResult> {
      let last: unknown;
      for (const provider of providers) {
        try {
          return await provider.edit(request);
        } catch (err) {
          last = err;
          if (!(err instanceof AiError) || (err.code !== 'unavailable' && err.code !== 'busy')) throw err;
        }
      }
      throw last;
    },
  };
}

let live: ImageEditProvider | null = null;
let demo: ImageEditProvider | null = null;

export function getDemoProvider(): ImageEditProvider {
  demo ??= createMockProvider();
  return demo;
}

function getLiveProvider(): ImageEditProvider {
  if (!live) {
    const configured = (import.meta.env.VITE_AI_SPACES as string | undefined)?.split(',').map((s) => s.trim()).filter(Boolean);
    const spaces = configured && configured.length > 0 ? configured : [DEFAULT_SPACE];
    live = createChainProvider(spaces.map((space) => createGradioProvider({ space, getToken: getHfToken })));
  }
  return live;
}

export function getImageProvider(): ImageEditProvider {
  return getProviderMode() === 'live' ? getLiveProvider() : getDemoProvider();
}
