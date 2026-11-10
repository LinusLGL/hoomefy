import { MAX_FREE_TEXT } from '@/features/studio/prompt';

/** Adds a phrase to the end of what is already written, as a new sentence, within the length limit. */
export function appendPhrase(current: string, phrase: string): string {
  const base = current.trim().replace(/[.\s]+$/, '');
  const next = base ? `${base}. ${phrase}` : phrase;
  return next.slice(0, MAX_FREE_TEXT);
}
