/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_COGNITO_USER_POOL_ID?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
  readonly VITE_COGNITO_REGION?: string;
  readonly VITE_ENABLE_HAUNTED?: string;
  readonly VITE_DEMO_MODE?: string;
  /** "live" uses the real FLUX model; "demo" uses the colour-grade stand-in. Defaults to live in production builds. */
  readonly VITE_AI_PROVIDER?: string;
  /** Comma-separated Hugging Face Space ids to try in order. Defaults to the official FLUX.2-klein-4B Space. */
  readonly VITE_AI_SPACES?: string;
  /** "off" turns off the Cloudflare Workers AI backup source. On by default when a Supabase project is configured. */
  readonly VITE_AI_FALLBACK?: string;
  /** "true" lets visitors open the studio without an account. */
  readonly VITE_ALLOW_GUESTS?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
