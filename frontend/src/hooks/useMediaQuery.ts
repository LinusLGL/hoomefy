import { useEffect, useState } from 'react';

/**
 * True while the CSS media query matches. Used where a control has to live in a different place on wide
 * screens, so it is rendered once (a CSS-only move would need two copies with the same ids and labels).
 * Without matchMedia (older test environments) it reports false, i.e. the small-screen layout.
 */
export function useMediaQuery(query: string): boolean {
  const read = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState<boolean>(read);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener?.('change', onChange);
    return () => list.removeEventListener?.('change', onChange);
  }, [query]);

  return matches;
}
