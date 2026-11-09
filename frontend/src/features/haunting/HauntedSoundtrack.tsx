/**
 * HauntedSoundtrack
 *
 * Connects the haunting store to the soundtrack. It renders nothing.
 *
 *   takeover starts                       -> the sting, then the ambient loop
 *   switched to Haunted from the settings -> the sting, then the ambient loop
 *   a reload that is already Haunted      -> the ambient loop only
 *   Elegant, horror off, or sound muted   -> silence
 */

import { useEffect, useRef } from 'react';
import { useHauntingStore } from './hauntingStore';
import { createSoundtrack, type Soundtrack } from './soundtrack';
import { useMediaPlaying } from '@/features/holywater/holyWaterStore';

export function HauntedSoundtrack() {
  const experience = useHauntingStore((s) => s.experience);
  const horrorEnabled = useHauntingStore((s) => s.horrorEnabled);
  const audioEnabled = useHauntingStore((s) => s.audioEnabled);
  const sequence = useHauntingStore((s) => s.sequence);
  // The jumpscare and the cure bring their own sound: the music stays quiet under them.
  const videoPlaying = useMediaPlaying();

  const trackRef = useRef<Soundtrack | null>(null);
  const previous = useRef({ experience, sequence });

  useEffect(() => {
    const track = createSoundtrack();
    trackRef.current = track;
    return () => {
      track.dispose();
      trackRef.current = null;
    };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const was = previous.current;
    previous.current = { experience, sequence };
    if (!track) return;

    if (!horrorEnabled || !audioEnabled || videoPlaying) {
      track.stop();
      return;
    }

    if (sequence === 'running') {
      // The takeover has just been triggered (or sound was switched back on while it runs).
      if (track.state === 'idle') track.playSting();
      return;
    }

    if (experience === 'haunted') {
      const enteredFromSettings = was.experience !== 'haunted' && was.sequence !== 'running';
      if (enteredFromSettings) track.playSting();
      else track.playAmbient();
      return;
    }

    track.stop();
  }, [experience, horrorEnabled, audioEnabled, sequence, videoPlaying]);

  return null;
}
