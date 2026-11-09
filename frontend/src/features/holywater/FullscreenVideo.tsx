/**
 * FullscreenVideo
 *
 * The jumpscare and the holy-water cure both play as a full-screen video above everything else.
 *
 * - It tries to play with sound. Browsers refuse that before the visitor has interacted with the
 *   site; then it plays muted instead, so the picture is never lost.
 * - Escape ends it (the cure also has a visible Skip button). The scare deliberately has none, so
 *   it is not spoiled, but Escape always works and the dialog's name says so.
 * - It ends on its own when the video ends, errors, or after `maxMs` in case it never starts.
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface FullscreenVideoProps {
  src: string;
  kind: 'scare' | 'cure';
  /** Accessible name of the dialog. */
  label: string;
  /** The longest the overlay may stay up. */
  maxMs: number;
  onDone: () => void;
}

export function FullscreenVideo({ src, kind, label, maxMs, onDone }: FullscreenVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = useRef(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDoneRef.current();
  }).current;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    video.muted = false;
    const started = video.play();
    started?.catch(() => {
      // Sound was refused: play the picture without it.
      video.muted = true;
      video.play()?.catch(finish);
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      finish();
    };
    window.addEventListener('keydown', onKey, true);
    const failsafe = window.setTimeout(finish, maxMs);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.clearTimeout(failsafe);
    };
  }, [finish, maxMs]);

  return createPortal(
    <div
      className="hf-video"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} Press Escape to skip.`}
      data-testid="holy-video"
      data-kind={kind}
    >
      <video
        ref={videoRef}
        className="hf-video__player"
        src={src}
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
      />
      {kind === 'cure' && (
        <button type="button" className="hf-video__skip" onClick={finish}>
          Skip
        </button>
      )}
    </div>,
    document.body
  );
}
