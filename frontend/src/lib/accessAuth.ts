/**
 * The visitor's sign-in, in the form this site's own Worker routes check (`/api/redesign`, `/api/detect-items`,
 * `/api/furniture-search`): the Supabase access token as a bearer token, plus the publishable key the Worker
 * forwards to Supabase to confirm the token is real. Returns nothing when nobody is signed in.
 */

import { supabase } from '@/lib/supabase';

export interface AccessAuth {
  /** The visitor's Supabase access token. */
  token: string;
  /** The Supabase publishable (anon) key. It is public by design. */
  apiKey: string;
}

export async function getAccessAuth(): Promise<AccessAuth | null> {
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

/** Request headers for the site's own routes. Empty when nobody is signed in, and the route then says so. */
export async function authHeaders(): Promise<Record<string, string>> {
  const auth = await getAccessAuth();
  return auth ? { Authorization: `Bearer ${auth.token}`, apikey: auth.apiKey } : {};
}
