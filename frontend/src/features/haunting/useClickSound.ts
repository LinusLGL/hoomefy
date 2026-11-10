/**
 * useClickSound
 *
 * While `enabled` (the Haunted site with its sound on), every click on the page makes the fire crackle sound. It is
 * listened for on the document in the capture phase so no handler can swallow it, and it stays quiet while the
 * jumpscare or the holy-water video is playing (they bring their own sound).
 */

import { useEffect } from 'react';
import { useHolyWaterStore } from '@/features/holywater/holyWaterStore';
import { createClickSound } from './clickSound';

export function useClickSound(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const sound = createClickSound();
    sound.preload();
    const onClick = () => {
      if (useHolyWaterStore.getState().video !== 'none') return;
      sound.play();
    };
    document.addEventListener('click', onClick, { capture: true, passive: true });
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      sound.stop();
    };
  }, [enabled]);
}
