/**
 * HauntedMansionBackground
 *
 * The candle-lit great hall behind the Haunted UI: the "Haunted Mansion" wallpaper, fixed behind the page.
 * It is lit by CSS (flickering candle, fireplace and chandelier glows, a slow push-in, a red pulse), and a
 * transparent 2D canvas on top animates only:
 *   - drifting fog,
 *   - suspended dust motes.
 * Film grain, vignette and the mist bank are cheap CSS layers.
 *
 * Performance: renders only while the Haunted experience (or Phase C/D of the
 * takeover) is active, capped at 24 fps (18 fps on mobile), and paused while the
 * tab is hidden. Nothing runs in the Elegant experience.
 */

import { useEffect, useRef } from 'react';
import { useHauntingStore } from './hauntingStore';
import { isMobileLike, prefersReducedMotion, seeded } from './env';
import { registerBackground } from './registry';

interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
  ph: number;
}

export function HauntedMansionBackground() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mistRef = useRef<HTMLDivElement>(null);

  const experience = useHauntingStore((s) => s.experience);
  const phase = useHauntingStore((s) => s.phase);
  const horrorEnabled = useHauntingStore((s) => s.horrorEnabled);
  const active = horrorEnabled && (experience === 'haunted' || phase === 'C' || phase === 'D');

  useEffect(() => registerBackground(wrapRef.current, mistRef.current), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const mobile = isMobileLike();
    const W = mobile ? 640 : 960;
    const H = mobile ? 400 : 600;
    canvas.width = W;
    canvas.height = H;

    const rnd = seeded(77);
    const reduced = prefersReducedMotion();
    const moteCount = reduced ? 0 : mobile ? 22 : 64;
    const motes: Mote[] = Array.from({ length: moteCount }, () => ({
      x: rnd() * W,
      y: rnd() * H,
      r: 0.6 + rnd() * 1.6,
      vx: (rnd() - 0.5) * 6,
      vy: -2 - rnd() * 6,
      a: 0.15 + rnd() * 0.35,
      ph: rnd() * 6.28,
    }));

    // Pre-rendered soft fog sprite
    const fog = document.createElement('canvas');
    fog.width = 512;
    fog.height = 256;
    const fctx = fog.getContext('2d');
    if (fctx) {
      for (let i = 0; i < 9; i++) {
        const g = fctx.createRadialGradient(rnd() * 512, rnd() * 256, 4, rnd() * 512, rnd() * 256, 90 + rnd() * 90);
        g.addColorStop(0, 'rgba(120,140,128,0.5)');
        g.addColorStop(1, 'rgba(120,140,128,0)');
        fctx.fillStyle = g;
        fctx.fillRect(0, 0, 512, 256);
      }
    }

    const frameMs = 1000 / (mobile ? 18 : 24);
    let raf = 0;
    let last = 0;
    let running = true;

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (!running || now - last < frameMs) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      ctx.clearRect(0, 0, W, H);

      // Fog drift
      ctx.globalCompositeOperation = 'screen';
      const fx = ((now * 0.012) % 512) - 512;
      ctx.globalAlpha = 0.22;
      ctx.drawImage(fog, fx, H * 0.35, 512 * 1.8, 256 * 1.3);
      ctx.drawImage(fog, fx + 512 * 1.8, H * 0.35, 512 * 1.8, 256 * 1.3);
      ctx.globalCompositeOperation = 'source-over';

      // Dust
      ctx.fillStyle = '#D8D4C8';
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -4) m.y = H + 4;
        if (m.x < -4) m.x = W + 4;
        if (m.x > W + 4) m.x = -4;
        ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(now * 0.001 + m.ph));
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const onVisibility = () => {
      running = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active]);

  return (
    <div ref={wrapRef} className="hf-bg" data-active={active ? 'true' : 'false'} aria-hidden="true" data-testid="haunted-background">
      <div className="hf-bg__wall" />
      <div className="hf-bg__lights">
        <span className="hf-bg__light hf-bg__light--chandelier" />
        <span className="hf-bg__light hf-bg__light--fire" />
        <span className="hf-bg__light hf-bg__light--candles" />
        <span className="hf-bg__light hf-bg__light--moon" />
      </div>
      <canvas ref={canvasRef} className="hf-bg__canvas" />
      <div className="hf-bg__vignette" />
      <div ref={mistRef} className="hf-bg__mist" />
      <div className="hf-bg__grain" />
    </div>
  );
}
