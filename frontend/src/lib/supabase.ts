/**
 * The Supabase client, or null when the site is not connected to a Supabase project.
 *
 * With no project configured (local development and the automated tests) the studio runs in a
 * self-contained mode: sign-in is simulated and saved designs live only in this tab. Setting
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY switches on real accounts and storage.
 * The anon key is public by design; every table and file is protected by row-level security.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;

export const DESIGNS_BUCKET = 'designs';
