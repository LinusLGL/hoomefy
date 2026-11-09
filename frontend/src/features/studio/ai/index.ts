/**
 * Chooses which provider the studio uses and holds the two small pieces of visitor state it needs:
 * the consent to send a photo to Hugging Face, and an optional Hugging Face token.
 *
 * Production builds use the real model. Local development and the automated tests use the demo
 * renderer unless VITE_AI_PROVIDER=live is set, so a test run never spends anyone's free GPU time.
 */

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { createCloudflareProvider, type CloudflareAuth } from './cloudflareProvider';
import { createGradioProvider, DEFAULT_SPACE } from './gradioProvider';
import { createMockProvider } from './mockProvider';
import { AiError, type EditRequest, type EditResult, type ImageEditProvider } from './types';

export * from './types';
export { classifyGradioError, createGradioProvider, DEFAULT_SPACE } from './gradioProvider';
export { createCloudflareProvider } from './cloudflareProvider';
export { createMockProvider } from './mockProvider';

export const HF_TOKEN_KEY = 'hoomefy_hf_token';
/** v2: the photo can now also go to Cloudflare Workers AI, so people who agreed to Hugging Face alone are asked again. */
export const AI_CONSENT_KEY = 'hoomefy_ai_consent_v2';

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

// ---- Backup source ----

/**
 * True when the studio may use the backup source (the same model on Cloudflare Workers AI). It needs a Supabase
 * project, because only signed-in visitors can use it. Set VITE_AI_FALLBACK=off to turn it off.
 */
export function isBackupAiEnabled(): boolean {
  return isSupabaseConfigured && import.meta.env.VITE_AI_FALLBACK !== 'off';
}

async function getBackupAuth(): Promise<CloudflareAuth | null> {
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabase || !apiKey) return null;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { token, apiKey } : null;
  } catch {
    return null;
  }
}

// ---- Consent to send the photograph to the AI service ----

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

/** Errors that mean "this source cannot help right now", so the next one is worth trying. */
const TRY_NEXT: ReadonlySet<string> = new Set(['quota', 'busy', 'unavailable']);

/**
 * Tries each provider in turn. When one is down, busy or out of free time the next is tried.
 *
 * Providers that draw on the same free allowance share a `quotaGroup` (every Hugging Face Space shares one GPU
 * allowance). Once a group reports "used up", the rest of that group is skipped, but a provider with its own
 * allowance, such as Cloudflare Workers AI, is still tried. If every source fails, the "used up" error is the one
 * reported, because that is what the visitor can act on. Refusals and cancellations end the attempt at once.
 */
export function createChainProvider(providers: ImageEditProvider[]): ImageEditProvider {
  if (providers.length === 1) return providers[0];
  return {
    id: providers.map((p) => p.id).join('>'),
    label: providers[0].label,
    sendsPhoto: providers.some((p) => p.sendsPhoto),
    async edit(request: EditRequest): Promise<EditResult> {
      const usedUp = new Set<string>();
      const failures: AiError[] = [];
      for (const provider of providers) {
        if (usedUp.has(provider.quotaGroup ?? provider.id)) continue;
        try {
          return await provider.edit(request);
        } catch (err) {
          if (!(err instanceof AiError) || !TRY_NEXT.has(err.code)) throw err;
          failures.push(err);
          if (err.code === 'quota') usedUp.add(provider.quotaGroup ?? provider.id);
        }
      }
      throw failures.find((f) => f.code === 'quota') ?? failures[0];
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
    const providers: ImageEditProvider[] = spaces.map((space) => createGradioProvider({ space, getToken: getHfToken }));
    // Last resort before the demo: the same model on Cloudflare, with its own free allowance (signed-in visitors only).
    if (isBackupAiEnabled()) providers.push(createCloudflareProvider({ getAuth: getBackupAuth }));
    live = createChainProvider(providers);
  }
  return live;
}

export function getImageProvider(): ImageEditProvider {
  return getProviderMode() === 'live' ? getLiveProvider() : getDemoProvider();
}
