import type { DesignPreferences } from '@/types';

export const MAX_WISH_LENGTH = 500;

/**
 * Only the fields the studio understands survive from storage or from a saved design. Choices that were removed
 * from the studio (the colour palette and the furniture to replace) are dropped here, so old data cannot bring them back.
 */
export function cleanPreferences(input: unknown): DesignPreferences {
  if (!input || typeof input !== 'object') return {};
  const p = input as Record<string, unknown>;
  const out: DesignPreferences = {};
  if (typeof p.intensity === 'number' && p.intensity >= 0 && p.intensity <= 1) out.intensity = p.intensity;
  if (typeof p.customInstructions === 'string') out.customInstructions = p.customInstructions.slice(0, MAX_WISH_LENGTH);
  if (typeof p.customStyle === 'string') out.customStyle = p.customStyle.slice(0, MAX_WISH_LENGTH);
  if (typeof p.budget === 'number' && p.budget >= 0) out.budget = p.budget;
  return out;
}
