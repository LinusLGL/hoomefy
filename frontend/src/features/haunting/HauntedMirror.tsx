/**
 * HauntedMirror
 *
 * Presented as an ordinary "statement mirror" furnishing tile.
 *   - In Elegant, pressing it lets the haunting in, at once and every time (touchMirror in effects.ts).
 *   - In Haunted, pressing it plays the jumpscare video, every time (not with reduced motion, which skips video).
 *
 * It is a real <button> so it is keyboard reachable and announced as a control.
 */

import { useEffect, useRef } from 'react';
import { ParanormalShadow } from './ParanormalShadow';
import { renderScene, paintElegantRoom } from './scenes';
import { touchMirror } from './effects';
import { useHauntingStore } from './hauntingStore';
import { prefersReducedMotion } from './env';
import { useHolyWaterStore } from '@/features/holywater/holyWaterStore';

/** What pressing the mirror does: let the haunting in (Elegant) or scare the visitor (Haunted). */
function pressMirror(shadowEl: HTMLElement | null): void {
  const state = useHauntingStore.getState();
  if (state.experience === 'haunted') {
    if (state.horrorEnabled && state.sequence === 'idle' && !prefersReducedMotion()) useHolyWaterStore.getState().scareNow();
    return;
  }
  touchMirror(shadowEl);
}

export function HauntedMirror() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  // Paint the "reflection": the elegant room, mirrored.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 360;
    canvas.height = 520;
    const src = renderScene(paintElegantRoom, 720, 520);
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 180, 0, 360, 520, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    const sheen = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    sheen.addColorStop(0, 'rgba(255,255,255,0.28)');
    sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(255,255,255,0.12)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <button
      type="button"
      className="hf-mirror"
      aria-label="Statement mirror. Select to look closer."
      onClick={() => pressMirror(shadowRef.current)}
      data-distort=""
    >
      <span className="hf-mirror__frame">
        <span className="hf-mirror__glass">
          <canvas ref={canvasRef} aria-hidden="true" />
          <ParanormalShadow ref={shadowRef} className="hf-mirror__shadow" />
        </span>
      </span>
    </button>
  );
}
