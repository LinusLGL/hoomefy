import { useIsHaunted } from '@/features/haunting/hauntingStore';

/** Tagline for the current experience. */
export function useTagline(): string {
  return useIsHaunted() ? 'Dream Home. Dark Side.' : 'Dream Home. Reimagined.';
}
