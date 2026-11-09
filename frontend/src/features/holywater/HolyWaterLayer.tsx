/**
 * HolyWaterLayer
 *
 * Everything the holy-water hunt adds to the Haunted experience, mounted once by the provider
 * while the site is Haunted:
 *   - the room viewer (opened from the home page cards),
 *   - the ghost avatar with its speech bubble and the holy-water bottle,
 *   - the jumpscare timer and the two full-screen videos (the scare and the cure).
 *
 * The cure ends by returning the whole site to Elegant, which unmounts this layer.
 */

import { useCallback, useEffect } from 'react';
import { useHauntingStore } from '@/features/haunting/hauntingStore';
import { FullscreenVideo } from './FullscreenVideo';
import { GhostAvatar } from './GhostAvatar';
import { RoomViewer } from './RoomViewer';
import { useHolyWaterStore } from './holyWaterStore';
import { useScareTimer } from './useScareTimer';

export const SCARE_VIDEO = '/video/jumpscare.mp4';
export const CURE_VIDEO = '/video/holywater.mp4';

interface HolyWaterLayerProps {
  /** The candle is in use (Haunted, candle cursor and darkness on, a mouse), so it can burn down. */
  scareEnabled: boolean;
  reducedMotion: boolean;
}

export function HolyWaterLayer({ scareEnabled, reducedMotion }: HolyWaterLayerProps) {
  const video = useHolyWaterStore((s) => s.video);
  useScareTimer(scareEnabled, reducedMotion);

  // Nothing transient survives leaving the Haunted experience.
  useEffect(() => () => useHolyWaterStore.getState().resetTransient(), []);

  const endScare = useCallback(() => useHolyWaterStore.getState().finishVideo(), []);
  const endCure = useCallback(() => {
    useHolyWaterStore.getState().finishVideo();
    useHauntingStore.getState().chooseElegant();
  }, []);

  return (
    <>
      <RoomViewer />
      <GhostAvatar reducedMotion={reducedMotion} />
      {video === 'scare' && (
        <FullscreenVideo kind="scare" src={SCARE_VIDEO} label="Something is in the room." maxMs={16_000} onDone={endScare} />
      )}
      {video === 'cure' && (
        <FullscreenVideo kind="cure" src={CURE_VIDEO} label="The holy water drives the ghost away." maxMs={12_000} onDone={endCure} />
      )}
    </>
  );
}
