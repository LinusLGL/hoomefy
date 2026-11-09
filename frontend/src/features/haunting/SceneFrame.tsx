/**
 * SceneFrame
 *
 * An editorial image slot backed by DistortedImageTransition. It shows the
 * elegant interior and can be warped into the neglected room (anomaly) or
 * the moonlit mansion room (takeover). It re-syncs to the current experience whenever
 * no takeover is running, so a reload in Haunted mode shows the mansion.
 *
 * Includes a ParanormalShadow so "a shadow appears in an image and vanishes"
 * stays inside the picture's bounds.
 */

import { useEffect, useRef, useState } from 'react';
import { DistortedImageTransition, type DistortedImageHandle, type TextureSource } from './DistortedImageTransition';
import { ParanormalShadow } from './ParanormalShadow';
import { getScene, type SceneName } from './scenes';
import { registerScene } from './registry';
import { useHauntingStore } from './hauntingStore';
import { isMobileLike } from './env';
import { cn } from '@/utils/cn';

interface SceneFrameProps {
  id: string;
  label: string;
  from?: SceneName;
  to?: SceneName;
  className?: string;
  /** Mark the frame as the hero image so anomalies can find its shadow. */
  hero?: boolean;
  /** A real photograph to show in the Elegant experience instead of the painted `from` scene. */
  photo?: string;
  /** A real image to dissolve into when the mansion takes over, instead of the painted `to` scene. */
  toPhoto?: string;
}

interface DecodedImage {
  img: HTMLImageElement | null;
  status: 'none' | 'pending' | 'ready' | 'failed';
}

function useDecodedImage(src: string | undefined): DecodedImage {
  const [state, setState] = useState<DecodedImage>({ img: null, status: src ? 'pending' : 'none' });
  useEffect(() => {
    if (!src) {
      setState({ img: null, status: 'none' });
      return undefined;
    }
    let cancelled = false;
    setState({ img: null, status: 'pending' });
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    img
      .decode()
      .then(() => !cancelled && setState({ img, status: 'ready' }))
      .catch(() => !cancelled && setState({ img: null, status: 'failed' }));
    return () => {
      cancelled = true;
    };
  }, [src]);
  return state;
}

export function SceneFrame({ id, label, from = 'room', to = 'mansion', className, hero = false, photo, toPhoto }: SceneFrameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<DistortedImageHandle>(null);
  const fromRef = useRef<TextureSource>(null);
  const [textures, setTextures] = useState<{ from: TextureSource; to: TextureSource } | null>(null);
  // 'pending' until the photo has decoded; 'failed' falls back to the painted scene so the page still renders.
  const photoState = useDecodedImage(photo);
  const toPhotoState = useDecodedImage(toPhoto);

  const experience = useHauntingStore((s) => s.experience);
  const sequence = useHauntingStore((s) => s.sequence);
  const horrorEnabled = useHauntingStore((s) => s.horrorEnabled);

  // Paint the textures after mount so the first paint is not blocked.
  useEffect(() => {
    if (photoState.status === 'pending' || toPhotoState.status === 'pending') return undefined;
    const mobile = isMobileLike();
    const w = mobile ? 800 : 1280;
    const h = mobile ? 500 : 800;
    const id1 = window.requestAnimationFrame(() => {
      setTextures({ from: photoState.img ?? getScene(from, w, h), to: toPhotoState.img ?? getScene(to, w, h) });
    });
    return () => window.cancelAnimationFrame(id1);
  }, [from, to, photoState, toPhotoState]);

  fromRef.current = textures?.from ?? null;

  // Register so the controller and anomalies can drive this frame.
  useEffect(() => {
    const wrap = wrapRef.current;
    const handle = handleRef.current;
    if (!wrap || !handle) return undefined;
    return registerScene(id, { el: wrap, handle, getFrom: () => fromRef.current });
  }, [id, textures]);

  // Settle to the correct static image whenever no takeover is running.
  useEffect(() => {
    if (sequence !== 'idle' || !textures) return;
    const haunted = horrorEnabled && experience === 'haunted';
    handleRef.current?.set({ progress: haunted ? 1 : 0, distort: 0, split: 0, time: 0 });
  }, [experience, sequence, horrorEnabled, textures]);

  return (
    <div
      ref={wrapRef}
      className={cn('hf-scene', className)}
      data-ready={textures ? 'true' : 'false'}
      data-distort=""
      {...(hero ? { 'data-hero-frame': '' } : {})}
    >
      <DistortedImageTransition
        ref={handleRef}
        from={textures?.from ?? null}
        to={textures?.to ?? null}
        className="hf-scene__canvas"
        label={label}
        textureAspect={1.6}
      />
      <ParanormalShadow className="hf-scene__shadow" />
    </div>
  );
}
