/**
 * Saved designs.
 *
 * With a Supabase project connected, a design is a row in the `designs` table plus two private image
 * files, both readable only by their owner (row-level security, see supabase/migrations). Nothing is
 * stored unless the visitor presses "Save design" and agrees.
 *
 * Without a project (local development and the automated tests) designs are kept in memory for this
 * tab only, so the whole save-and-reopen flow can still be used.
 */

import type { DesignPreferences, DesignStyle } from '@/types';
import { DESIGNS_BUCKET, supabase } from '@/lib/supabase';
import { isDesignStyle } from '@/features/studio/styles';
import { cleanPreferences } from '@/features/studio/preferences';
import { cleanItems, type ShoppingItem } from '@/features/furniture/shoppingStore';

export interface SavedDesign {
  id: string;
  name: string;
  style: DesignStyle;
  prompt: string;
  preferences: DesignPreferences;
  shopping: ShoppingItem[];
  originalUrl: string | null;
  generatedUrl: string | null;
  createdAt: string;
}

export interface SaveDesignInput {
  name: string;
  style: DesignStyle;
  prompt: string;
  preferences: DesignPreferences;
  shopping: ShoppingItem[];
  original: Blob;
  generated: Blob;
}

export const MAX_DESIGNS = 50;
export const NAME_MAX = 80;
const SIGNED_URL_SECONDS = 60 * 60;

interface DesignRow {
  id: string;
  name: string;
  style: string;
  prompt: string | null;
  preferences: unknown;
  shopping: unknown;
  original_path: string;
  generated_path: string;
  created_at: string;
}

export { cleanPreferences };

export function rowToDesign(row: DesignRow, urls: { original: string | null; generated: string | null }): SavedDesign {
  return {
    id: row.id,
    name: row.name,
    style: isDesignStyle(row.style) ? row.style : 'custom',
    prompt: row.prompt ?? '',
    preferences: cleanPreferences(row.preferences),
    shopping: cleanItems(row.shopping),
    originalUrl: urls.original,
    generatedUrl: urls.generated,
    createdAt: row.created_at,
  };
}

// ---- Without a Supabase project: memory only ----

const memory: SavedDesign[] = [];

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

class DesignsService {
  /** True when designs are stored on a server, false when they only live in this tab. */
  get persistent(): boolean {
    return supabase !== null;
  }

  async list(): Promise<SavedDesign[]> {
    if (!supabase) return [...memory];

    const { data, error } = await supabase.from('designs').select('*').order('created_at', { ascending: false }).limit(MAX_DESIGNS);
    if (error) throw new Error('We could not load your designs. Please try again.');
    const rows = (data ?? []) as DesignRow[];
    if (rows.length === 0) return [];

    const paths = rows.flatMap((r) => [r.original_path, r.generated_path]);
    const { data: signed } = await supabase.storage.from(DESIGNS_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
    const urlFor = new Map((signed ?? []).map((s) => [s.path ?? '', s.signedUrl]));
    return rows.map((r) => rowToDesign(r, { original: urlFor.get(r.original_path) ?? null, generated: urlFor.get(r.generated_path) ?? null }));
  }

  async save(input: SaveDesignInput): Promise<SavedDesign> {
    const name = input.name.trim().slice(0, NAME_MAX);
    if (!name) throw new Error('Please give your design a name.');

    if (!supabase) {
      const design: SavedDesign = {
        id: newId(),
        name,
        style: input.style,
        prompt: input.prompt,
        preferences: input.preferences,
        shopping: input.shopping,
        originalUrl: URL.createObjectURL(input.original),
        generatedUrl: URL.createObjectURL(input.generated),
        createdAt: new Date().toISOString(),
      };
      memory.unshift(design);
      return design;
    }

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) throw new Error('Please sign in to save designs.');

    const { count } = await supabase.from('designs').select('id', { count: 'exact', head: true });
    if ((count ?? 0) >= MAX_DESIGNS) throw new Error(`You can keep up to ${MAX_DESIGNS} designs. Delete one to make room.`);

    const id = newId();
    const originalPath = `${uid}/${id}/original.jpg`;
    const generatedPath = `${uid}/${id}/generated.jpg`;
    const bucket = supabase.storage.from(DESIGNS_BUCKET);

    const up1 = await bucket.upload(originalPath, input.original, { contentType: 'image/jpeg', upsert: false });
    if (up1.error) throw new Error('We could not upload your photo. Please try again.');
    const up2 = await bucket.upload(generatedPath, input.generated, { contentType: 'image/jpeg', upsert: false });
    if (up2.error) {
      await bucket.remove([originalPath]);
      throw new Error('We could not upload your design. Please try again.');
    }

    const { data, error } = await supabase
      .from('designs')
      .insert({
        id,
        name,
        style: input.style,
        prompt: input.prompt.slice(0, 4000),
        preferences: cleanPreferences(input.preferences),
        shopping: input.shopping,
        original_path: originalPath,
        generated_path: generatedPath,
      })
      .select('*')
      .single();
    if (error || !data) {
      await bucket.remove([originalPath, generatedPath]);
      throw new Error('We could not save your design. Please try again.');
    }

    const { data: signed } = await bucket.createSignedUrls([originalPath, generatedPath], SIGNED_URL_SECONDS);
    const urlFor = new Map((signed ?? []).map((s) => [s.path ?? '', s.signedUrl]));
    return rowToDesign(data as DesignRow, { original: urlFor.get(originalPath) ?? null, generated: urlFor.get(generatedPath) ?? null });
  }

  async remove(design: Pick<SavedDesign, 'id'>): Promise<void> {
    if (!supabase) {
      const i = memory.findIndex((d) => d.id === design.id);
      if (i >= 0) {
        const [gone] = memory.splice(i, 1);
        if (gone.originalUrl) URL.revokeObjectURL(gone.originalUrl);
        if (gone.generatedUrl) URL.revokeObjectURL(gone.generatedUrl);
      }
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) throw new Error('Please sign in again.');
    await supabase.storage.from(DESIGNS_BUCKET).remove([`${uid}/${design.id}/original.jpg`, `${uid}/${design.id}/generated.jpg`]);
    const { error } = await supabase.from('designs').delete().eq('id', design.id);
    if (error) throw new Error('We could not delete this design. Please try again.');
  }

  async rename(design: Pick<SavedDesign, 'id'>, name: string): Promise<void> {
    const clean = name.trim().slice(0, NAME_MAX);
    if (!clean) throw new Error('Please give your design a name.');
    if (!supabase) {
      const found = memory.find((d) => d.id === design.id);
      if (found) found.name = clean;
      return;
    }
    const { error } = await supabase.from('designs').update({ name: clean }).eq('id', design.id);
    if (error) throw new Error('We could not rename this design. Please try again.');
  }
}

export const designsService = new DesignsService();
