/**
 * HauntedBackdropVideo
 *
 * A looping, muted video behind a page (the Haunted sign-up screen). It renders only in the
 * Haunted experience. With reduced motion, or if the video cannot play, the poster frame is
 * shown instead. The video is muted on purpose: the haunted soundtrack keeps playing over it.
 */

import { useEffect, useRef } from 'react';
import { useHauntingStore } from './hauntingStore';
import { useHauntingEnv } from './hauntingEnvContext';

export const BACKDROP_VIDEO_SRC = '/video/signup-background.mp4';
export const BACKDROP_POSTER_SRC = '/video/signup-poster.jpg';

export function HauntedBackdropVideo() {
  const haunted = useHauntingStore((s) => s.horrorEnabled && s.experience === 'haunted');
  const { reducedMotion } = useHauntingEnv();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playVideo = haunted && !reducedMotion;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playVideo) return;
    // React does not reliably reflect the `muted` prop onto the element, and autoplay needs it.
    video.muted = true;
    void video.play().catch(() => undefined);
  }, [playVideo]);

  if (!haunted) return null;

  return (
    <div className="hf-backdrop" aria-hidden="true" data-testid="haunted-backdrop">
      {playVideo ? (
        <video
          ref={videoRef}
          className="hf-backdrop__media"
          src={BACKDROP_VIDEO_SRC}
          poster={BACKDROP_POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
        />
      ) : (
        <img className="hf-backdrop__media" src={BACKDROP_POSTER_SRC} alt="" />
      )}
      <div className="hf-backdrop__shade" />
    </div>
  );
}
