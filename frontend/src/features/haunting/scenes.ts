/**
 * Procedural scenes (Elegant living room + the haunted mansion).
 *
 * The repository ships no photography, so the three images used by the haunting
 * engine are painted on canvas. Every painter has the same signature, which means
 * real photographs can replace any of them: provide a `ScenePainter` that draws
 * the image into the context.
 */

import { seeded } from './env';

export type ScenePainter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
export type SceneName = 'room' | 'abandoned' | 'mansion';

type Pt = readonly [number, number];

function poly(ctx: CanvasRenderingContext2D, pts: Pt[], fill?: string | CanvasGradient, stroke?: string) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/* -------------------------------------------------------------------------- */
/* Elegant living room                                                         */
/* -------------------------------------------------------------------------- */

export const paintElegantRoom: ScenePainter = (ctx, w, h) => {
  const horizon = h * 0.66;

  // Wall
  const wall = ctx.createLinearGradient(0, 0, 0, horizon);
  wall.addColorStop(0, '#F4EEE1');
  wall.addColorStop(1, '#E6DCC6');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, horizon);

  // Wainscot line
  ctx.fillStyle = 'rgba(120,98,64,0.10)';
  ctx.fillRect(0, horizon - h * 0.04, w, h * 0.012);

  // Floor (warm oak with perspective planks)
  const floor = ctx.createLinearGradient(0, horizon, 0, h);
  floor.addColorStop(0, '#BFA37A');
  floor.addColorStop(1, '#8F7552');
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.strokeStyle = 'rgba(70,50,28,0.22)';
  ctx.lineWidth = 1;
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * w * 0.02, horizon);
    ctx.lineTo(w / 2 + i * w * 0.18, h);
    ctx.stroke();
  }

  // Window with soft daylight
  const wx = w * 0.08;
  const wy = h * 0.12;
  const ww = w * 0.2;
  const wh = h * 0.42;
  const glass = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
  glass.addColorStop(0, '#FFF9E6');
  glass.addColorStop(1, '#FBE9C0');
  ctx.fillStyle = glass;
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = '#CDBFA2';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy);
  ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.moveTo(wx, wy + wh / 2);
  ctx.lineTo(wx + ww, wy + wh / 2);
  ctx.stroke();
  // Light spill on the floor
  poly(
    ctx,
    [
      [wx + ww * 0.1, horizon + h * 0.02],
      [wx + ww * 1.05, horizon + h * 0.02],
      [wx + ww * 1.9, h],
      [wx - ww * 0.4, h],
    ],
    'rgba(255,240,200,0.20)'
  );

  // Framed art
  for (const [ax, ay, aw, ah, tint] of [
    [0.42, 0.14, 0.12, 0.2, '#B9A27A'],
    [0.57, 0.18, 0.08, 0.13, '#8E9A86'],
  ] as const) {
    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(w * ax, h * ay, w * aw, h * ah);
    ctx.strokeStyle = '#A88B5E';
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.strokeRect(w * ax, h * ay, w * aw, h * ah);
    ctx.fillStyle = tint;
    ctx.fillRect(w * (ax + aw * 0.12), h * (ay + ah * 0.12), w * aw * 0.76, h * ah * 0.76);
  }

  // Rug
  ctx.fillStyle = 'rgba(214,200,172,0.9)';
  ctx.beginPath();
  ctx.ellipse(w * 0.55, h * 0.86, w * 0.3, h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sofa
  const sx = w * 0.36;
  const sy = h * 0.5;
  const sw = w * 0.42;
  const sh = h * 0.24;
  ctx.fillStyle = 'rgba(60,45,25,0.18)';
  ctx.beginPath();
  ctx.ellipse(sx + sw / 2, sy + sh + h * 0.015, sw * 0.52, h * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#D9CDB5';
  roundRect(ctx, sx, sy, sw, sh, sh * 0.2);
  ctx.fill();
  ctx.fillStyle = '#E7DDC8';
  roundRect(ctx, sx + sw * 0.07, sy + sh * 0.1, sw * 0.86, sh * 0.5, sh * 0.15);
  ctx.fill();
  ctx.fillStyle = '#CFC1A5';
  roundRect(ctx, sx - sw * 0.03, sy + sh * 0.2, sw * 0.1, sh * 0.8, sh * 0.15);
  ctx.fill();
  roundRect(ctx, sx + sw * 0.93, sy + sh * 0.2, sw * 0.1, sh * 0.8, sh * 0.15);
  ctx.fill();
  ctx.fillStyle = '#B58C5A';
  roundRect(ctx, sx + sw * 0.14, sy + sh * 0.18, sw * 0.14, sh * 0.34, 8);
  ctx.fill();
  ctx.fillStyle = '#8E9A86';
  roundRect(ctx, sx + sw * 0.7, sy + sh * 0.18, sw * 0.14, sh * 0.34, 8);
  ctx.fill();

  // Side table + lamp
  const tx = w * 0.82;
  ctx.fillStyle = '#9C7B4F';
  ctx.fillRect(tx, h * 0.6, w * 0.07, h * 0.02);
  ctx.fillRect(tx + w * 0.032, h * 0.62, w * 0.006, h * 0.14);
  const glow = ctx.createRadialGradient(tx + w * 0.035, h * 0.5, 2, tx + w * 0.035, h * 0.5, w * 0.14);
  glow.addColorStop(0, 'rgba(255,230,170,0.55)');
  glow.addColorStop(1, 'rgba(255,230,170,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(tx - w * 0.12, h * 0.3, w * 0.28, h * 0.4);
  poly(
    ctx,
    [
      [tx + w * 0.01, h * 0.6],
      [tx + w * 0.06, h * 0.6],
      [tx + w * 0.05, h * 0.5],
      [tx + w * 0.02, h * 0.5],
    ],
    '#F6E8C6'
  );

  // Plant
  ctx.fillStyle = '#C9B896';
  ctx.beginPath();
  ctx.moveTo(w * 0.31, h * 0.76);
  ctx.lineTo(w * 0.35, h * 0.76);
  ctx.lineTo(w * 0.34, h * 0.84);
  ctx.lineTo(w * 0.32, h * 0.84);
  ctx.fill();
  ctx.fillStyle = '#7C8F6E';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.ellipse(w * 0.33 + (i - 3) * w * 0.008, h * 0.7 - Math.abs(i - 3) * h * 0.012, w * 0.012, h * 0.06, (i - 3) * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft vignette for an editorial feel
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.95);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(60,45,25,0.18)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
};

/* -------------------------------------------------------------------------- */
/* Haunted mansion: shared drawing helpers                                     */
/* -------------------------------------------------------------------------- */

const GOLD = '#b9904a';

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** A teardrop flame whose base sits at (x, y); height is roughly 2.6 * s. */
function flame(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, lit = true) {
  if (!lit) return;
  glow(ctx, x, y - s * 1.2, s * 9, '255,170,70', 0.38);
  const g = ctx.createRadialGradient(x, y - s * 0.9, s * 0.1, x, y - s * 0.9, s * 1.5);
  g.addColorStop(0, 'rgba(255,248,214,1)');
  g.addColorStop(0.45, 'rgba(255,196,96,0.95)');
  g.addColorStop(1, 'rgba(255,110,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 2.7);
  ctx.bezierCurveTo(x + s * 1.0, y - s * 1.5, x + s * 0.75, y, x, y);
  ctx.bezierCurveTo(x - s * 0.75, y, x - s * 1.0, y - s * 1.5, x, y - s * 2.7);
  ctx.fill();
}

function candle(ctx: CanvasRenderingContext2D, x: number, yBase: number, hgt: number, wid: number, lit: boolean) {
  const g = ctx.createLinearGradient(x - wid / 2, 0, x + wid / 2, 0);
  g.addColorStop(0, '#9c8f78');
  g.addColorStop(0.5, '#efe3c8');
  g.addColorStop(1, '#a89a80');
  ctx.fillStyle = g;
  ctx.fillRect(x - wid / 2, yBase - hgt, wid, hgt);
  ctx.fillStyle = lit ? '#f6e9cb' : '#cdbf9f';
  ctx.beginPath();
  ctx.ellipse(x, yBase - hgt, wid / 2, wid * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,12,8,0.9)';
  ctx.lineWidth = Math.max(1, wid * 0.08);
  ctx.beginPath();
  ctx.moveTo(x, yBase - hgt);
  ctx.lineTo(x, yBase - hgt - wid * 0.45);
  ctx.stroke();
  flame(ctx, x, yBase - hgt - wid * 0.4, wid * 0.55, lit);
}

/** Pointed gothic arch outline (does not fill). */
function gothicArch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + h * 0.38);
  ctx.quadraticCurveTo(x, y + h * 0.1, x + w / 2, y);
  ctx.quadraticCurveTo(x + w, y + h * 0.1, x + w, y + h * 0.38);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function cobweb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dirX: 1 | -1, alpha = 0.3) {
  ctx.save();
  ctx.strokeStyle = `rgba(225,225,235,${alpha})`;
  ctx.lineWidth = Math.max(0.6, r * 0.006);
  const rays = 7;
  for (let i = 0; i <= rays; i++) {
    const a = (i / rays) * (Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * dirX, y + Math.sin(a) * r);
    ctx.stroke();
  }
  for (let k = 1; k <= 5; k++) {
    const rr = (k / 5) * r;
    ctx.beginPath();
    for (let i = 0; i <= rays; i++) {
      const a = (i / rays) * (Math.PI / 2);
      const sag = 1 - 0.12 * Math.sin((i / rays) * Math.PI);
      const px = x + Math.cos(a) * rr * dirX * sag;
      const py = y + Math.sin(a) * rr * sag;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function fog(ctx: CanvasRenderingContext2D, w: number, y: number, thickness: number, alpha: number, seed: number) {
  const rnd = seeded(seed);
  for (let i = 0; i < 9; i++) {
    const cx = rnd() * w;
    const cy = y + (rnd() - 0.5) * thickness;
    const rx = w * (0.16 + rnd() * 0.22);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    g.addColorStop(0, `rgba(190,198,212,${alpha})`);
    g.addColorStop(1, 'rgba(190,198,212,0)');
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, thickness / (rx * 1.6));
    ctx.translate(-cx, -cy);
    ctx.fillStyle = g;
    ctx.fillRect(cx - rx, cy - rx, rx * 2, rx * 2);
    ctx.restore();
  }
}

/** A translucent ghost: head, shoulders and a flowing, wavy gown. (x, y) is the top of the head. */
function ghostFigure(ctx: CanvasRenderingContext2D, x: number, y: number, hgt: number, alpha: number, eyes = true) {
  const wd = hgt * 0.42;
  const g = ctx.createLinearGradient(0, y, 0, y + hgt);
  g.addColorStop(0, `rgba(222,232,244,${alpha})`);
  g.addColorStop(0.65, `rgba(190,205,225,${alpha * 0.7})`);
  g.addColorStop(1, 'rgba(170,190,215,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y + hgt * 0.1, hgt * 0.085, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - hgt * 0.05, y + hgt * 0.17);
  ctx.bezierCurveTo(x - wd * 0.7, y + hgt * 0.22, x - wd * 0.5, y + hgt * 0.5, x - wd, y + hgt);
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    ctx.lineTo(x - wd + t * wd * 2, y + hgt - Math.sin(t * Math.PI * 4) * hgt * 0.03);
  }
  ctx.bezierCurveTo(x + wd * 0.5, y + hgt * 0.5, x + wd * 0.7, y + hgt * 0.22, x + hgt * 0.05, y + hgt * 0.17);
  ctx.closePath();
  ctx.fill();
  if (eyes) {
    ctx.fillStyle = `rgba(10,8,14,${Math.min(0.85, alpha * 2)})`;
    ctx.beginPath();
    ctx.ellipse(x - hgt * 0.03, y + hgt * 0.1, hgt * 0.012, hgt * 0.02, 0, 0, Math.PI * 2);
    ctx.ellipse(x + hgt * 0.03, y + hgt * 0.1, hgt * 0.012, hgt * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.82) {
  const v = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.25, w / 2, h * 0.5, h * 1.0);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(4,2,3,${strength})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/* -------------------------------------------------------------------------- */
/* Moonlit room (hero image) and its abandoned twin                            */
/* -------------------------------------------------------------------------- */

function paintMansionRoomCore(ctx: CanvasRenderingContext2D, w: number, h: number, neglected: boolean) {
  const rnd = seeded(neglected ? 91 : 17);
  const floorY = h * 0.72;
  const velvet = neglected ? ['#4a4038', '#2c2622'] : ['#8a1a2e', '#4a0b18'];

  // Panelled wall
  const wall = ctx.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, '#120b0a');
  wall.addColorStop(1, '#241512');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, floorY);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = Math.max(1, w * 0.003);
  for (let x = 0; x < w; x += w * 0.075) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, floorY);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(120,80,50,0.10)';
  ctx.fillRect(0, floorY - h * 0.06, w, h * 0.012); // dado rail

  // Floor (dark boards)
  const floor = ctx.createLinearGradient(0, floorY, 0, h);
  floor.addColorStop(0, '#1d1110');
  floor.addColorStop(1, '#0a0606');
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, w, h - floorY);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + i * w * 0.03, floorY);
    ctx.lineTo(w * 0.5 + i * w * 0.2, h);
    ctx.stroke();
  }

  // Gothic window with moonlight
  const wx = w * 0.12;
  const wy = h * 0.05;
  const ww = w * 0.2;
  const wh = h * 0.6;
  gothicArch(ctx, wx, wy, ww, wh);
  ctx.save();
  ctx.clip();
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, neglected ? '#47525d' : '#7b8fa6');
  sky.addColorStop(1, '#202a35');
  ctx.fillStyle = sky;
  ctx.fillRect(wx, wy, ww, wh);
  const mx = wx + ww * 0.62;
  const my = wy + wh * 0.3;
  glow(ctx, mx, my, ww * 0.9, '170,195,225', neglected ? 0.25 : 0.55);
  ctx.fillStyle = neglected ? '#9aa6b2' : '#d3dde8';
  ctx.beginPath();
  ctx.arc(mx, my, ww * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(8,6,8,0.85)'; // bare branches
  ctx.lineWidth = Math.max(1.5, w * 0.003);
  const branch = (x: number, y: number, a: number, len: number, d: number) => {
    if (d === 0 || len < 4) return;
    const nx = x + Math.cos(a) * len;
    const ny = y + Math.sin(a) * len;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    branch(nx, ny, a - 0.45 - rnd() * 0.3, len * 0.72, d - 1);
    branch(nx, ny, a + 0.4 + rnd() * 0.3, len * 0.7, d - 1);
  };
  branch(wx + ww * 0.05, wy + wh * 0.95, -1.15, wh * 0.2, 6);
  branch(wx + ww * 0.95, wy + wh * 0.9, -1.95, wh * 0.18, 6);
  ctx.restore();
  ctx.strokeStyle = '#0b0707'; // tracery and frame
  ctx.lineWidth = Math.max(3, w * 0.006);
  gothicArch(ctx, wx, wy, ww, wh);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy + wh * 0.02);
  ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.moveTo(wx, wy + wh * 0.5);
  ctx.lineTo(wx + ww, wy + wh * 0.5);
  ctx.moveTo(wx, wy + wh * 0.28);
  ctx.quadraticCurveTo(wx + ww / 2, wy + wh * 0.05, wx + ww, wy + wh * 0.28);
  ctx.stroke();

  // Curtains
  const curtain = (x0: number, x1: number) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, velvet[1]);
    g.addColorStop(0.5, velvet[0]);
    g.addColorStop(1, velvet[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, h * 0.03);
    ctx.lineTo(x1, h * 0.03);
    ctx.bezierCurveTo(x1 + 4, h * 0.4, x1 - 6, h * 0.55, x1, floorY + h * 0.02);
    ctx.lineTo(x0, floorY + h * 0.02);
    ctx.bezierCurveTo(x0 - 6, h * 0.55, x0 + 4, h * 0.4, x0, h * 0.03);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, w * 0.002);
    for (let x = x0 + (x1 - x0) * 0.15; x < x1; x += (x1 - x0) * 0.2) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.04);
      ctx.lineTo(x + (rnd() - 0.5) * 4, floorY);
      ctx.stroke();
    }
    ctx.fillStyle = GOLD;
    ctx.fillRect(x0, h * 0.28, x1 - x0, Math.max(2, h * 0.008)); // tie-back
  };
  curtain(w * 0.075, w * 0.135);
  curtain(w * 0.315, w * 0.385);
  ctx.fillStyle = velvet[1]; // pelmet
  ctx.fillRect(w * 0.07, h * 0.02, w * 0.32, h * 0.045);
  ctx.fillStyle = GOLD;
  ctx.fillRect(w * 0.07, h * 0.06, w * 0.32, Math.max(2, h * 0.006));

  // Fireplace
  const fx = w * 0.64;
  const fw = w * 0.28;
  const fy = h * 0.42;
  ctx.fillStyle = '#17100f';
  ctx.fillRect(fx, fy, fw, floorY - fy);
  ctx.fillStyle = '#2a1b17'; // mantel shelf
  ctx.fillRect(fx - w * 0.01, fy - h * 0.025, fw + w * 0.02, h * 0.03);
  ctx.fillStyle = '#050303'; // firebox
  const bx = fx + fw * 0.16;
  const bw = fw * 0.68;
  const by = fy + h * 0.07;
  ctx.fillRect(bx, by, bw, floorY - by);
  if (!neglected) {
    glow(ctx, bx + bw / 2, floorY - h * 0.08, bw * 1.6, '255,120,40', 0.5);
    for (let i = 0; i < 7; i++) {
      const fxp = bx + bw * (0.15 + i * 0.12);
      flame(ctx, fxp, floorY - h * 0.01, bw * (0.06 + rnd() * 0.04));
    }
    ctx.fillStyle = '#2b1810';
    ctx.fillRect(bx + bw * 0.1, floorY - h * 0.02, bw * 0.8, h * 0.02); // logs
  }
  ctx.fillStyle = '#0a0606'; // hearth
  ctx.fillRect(fx - w * 0.02, floorY, fw + w * 0.04, h * 0.018);

  // Portrait above the mantel
  const px = fx + fw * 0.26;
  const pw = fw * 0.48;
  const pyy = h * 0.05;
  const ph = fy - h * 0.1;
  ctx.fillStyle = GOLD;
  roundRect(ctx, px - w * 0.008, pyy - w * 0.008, pw + w * 0.016, ph + w * 0.016, 6);
  ctx.fill();
  ctx.fillStyle = neglected ? '#201c1a' : '#130c0c';
  ctx.fillRect(px, pyy, pw, ph);
  if (!neglected) {
    ctx.fillStyle = 'rgba(210,190,175,0.85)'; // face
    ctx.beginPath();
    ctx.ellipse(px + pw / 2, pyy + ph * 0.38, pw * 0.15, ph * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0606'; // hair
    ctx.beginPath();
    ctx.ellipse(px + pw / 2, pyy + ph * 0.3, pw * 0.2, ph * 0.12, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(70,16,28,0.9)'; // gown
    ctx.beginPath();
    ctx.moveTo(px + pw * 0.15, pyy + ph);
    ctx.quadraticCurveTo(px + pw * 0.5, pyy + ph * 0.55, px + pw * 0.85, pyy + ph);
    ctx.fill();
  }

  // Candelabra on the mantel
  [fx + fw * 0.06, fx + fw * 0.94].forEach((cx) => {
    ctx.fillStyle = GOLD;
    ctx.fillRect(cx - w * 0.004, fy - h * 0.07, w * 0.008, h * 0.045);
    ctx.fillRect(cx - w * 0.012, fy - h * 0.028, w * 0.024, h * 0.006);
    candle(ctx, cx - w * 0.008, fy - h * 0.07, h * 0.05, w * 0.008, !neglected);
    candle(ctx, cx + w * 0.008, fy - h * 0.07, h * 0.04, w * 0.008, !neglected);
  });

  // Chaise
  const sx = w * 0.2;
  const sw = w * 0.4;
  const sy = h * 0.52;
  const sh = h * 0.25;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(sx + sw / 2, sy + sh + h * 0.01, sw * 0.55, h * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = GOLD;
  [0.06, 0.93].forEach((t) => ctx.fillRect(sx + sw * t, sy + sh - h * 0.02, w * 0.008, h * 0.05));
  const body = ctx.createLinearGradient(0, sy, 0, sy + sh);
  body.addColorStop(0, neglected ? '#6b625a' : '#9b2036');
  body.addColorStop(1, neglected ? '#3c3631' : '#4d0c1a');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(sx, sy + sh);
  ctx.lineTo(sx, sy + sh * 0.35);
  ctx.bezierCurveTo(sx, sy - sh * 0.05, sx + sw * 0.35, sy - sh * 0.1, sx + sw * 0.55, sy + sh * 0.1);
  ctx.bezierCurveTo(sx + sw * 0.8, sy + sh * 0.05, sx + sw, sy + sh * 0.2, sx + sw, sy + sh * 0.45);
  ctx.lineTo(sx + sw, sy + sh);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; // tufting
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 7; c++) {
      ctx.beginPath();
      ctx.arc(sx + sw * (0.14 + c * 0.11), sy + sh * (0.28 + r * 0.14), Math.max(1.5, w * 0.0025), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (neglected) {
    // dust sheet draped over the chaise
    ctx.fillStyle = 'rgba(176,170,160,0.92)';
    ctx.beginPath();
    ctx.moveTo(sx - sw * 0.03, sy + sh * 1.02);
    ctx.quadraticCurveTo(sx, sy - sh * 0.12, sx + sw * 0.5, sy + sh * 0.02);
    ctx.quadraticCurveTo(sx + sw * 1.02, sy + sh * 0.1, sx + sw * 1.03, sy + sh * 1.02);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,74,68,0.5)';
    for (let i = 1; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + sw * (i / 7), sy + sh * 0.1);
      ctx.lineTo(sx + sw * (i / 7) + (rnd() - 0.5) * 18, sy + sh);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = 'rgba(214,206,190,0.8)'; // lace throw on the arm
    ctx.beginPath();
    ctx.moveTo(sx - sw * 0.01, sy + sh * 0.36);
    ctx.quadraticCurveTo(sx + sw * 0.1, sy + sh * 0.3, sx + sw * 0.16, sy + sh * 0.9);
    ctx.lineTo(sx - sw * 0.01, sy + sh * 0.95);
    ctx.fill();
  }

  // Rug
  ctx.fillStyle = neglected ? '#3a2e2a' : '#5a0f1e';
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.99);
  ctx.lineTo(w * 0.82, h * 0.99);
  ctx.lineTo(w * 0.7, floorY + h * 0.05);
  ctx.lineTo(w * 0.22, floorY + h * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(201,161,90,0.55)';
  ctx.lineWidth = Math.max(1.5, w * 0.003);
  ctx.beginPath();
  ctx.moveTo(w * 0.14, h * 0.96);
  ctx.lineTo(w * 0.78, h * 0.96);
  ctx.lineTo(w * 0.68, floorY + h * 0.075);
  ctx.lineTo(w * 0.24, floorY + h * 0.075);
  ctx.closePath();
  ctx.stroke();

  // Coffee table with candles
  const tx = w * 0.43;
  const ty = h * 0.8;
  const tw = w * 0.2;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(tx + tw / 2, ty + h * 0.09, tw * 0.55, h * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0f0c';
  ctx.fillRect(tx + tw * 0.08, ty, w * 0.006, h * 0.09);
  ctx.fillRect(tx + tw * 0.9, ty, w * 0.006, h * 0.09);
  ctx.fillStyle = '#2c1a14';
  ctx.beginPath();
  ctx.ellipse(tx + tw / 2, ty, tw / 2, h * 0.022, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!neglected) {
    candle(ctx, tx + tw * 0.3, ty - h * 0.004, h * 0.055, w * 0.009, true);
    candle(ctx, tx + tw * 0.4, ty - h * 0.006, h * 0.04, w * 0.009, true);
    ctx.fillStyle = '#3d2b1f';
    ctx.fillRect(tx + tw * 0.58, ty - h * 0.03, tw * 0.2, h * 0.014); // books
    ctx.fillStyle = '#6a1626';
    ctx.fillRect(tx + tw * 0.6, ty - h * 0.044, tw * 0.17, h * 0.014);
  } else {
    ctx.fillStyle = 'rgba(176,170,160,0.9)';
    ctx.beginPath();
    ctx.ellipse(tx + tw / 2, ty - h * 0.012, tw * 0.5, h * 0.05, 0, Math.PI, 0);
    ctx.fill();
  }

  // The ghost
  ghostFigure(ctx, w * 0.62, h * 0.4, h * 0.38, neglected ? 0.1 : 0.34);

  // Cobwebs
  cobweb(ctx, w * 0.995, h * 0.01, w * 0.12, -1, 0.35);
  cobweb(ctx, w * 0.005, h * 0.01, w * 0.09, 1, 0.3);
  cobweb(ctx, fx + fw * 0.02, fy - h * 0.025, w * 0.07, 1, neglected ? 0.45 : 0.28);
  if (neglected) {
    cobweb(ctx, w * 0.5, h * 0.01, w * 0.14, -1, 0.4);
    cobweb(ctx, w * 0.5, h * 0.01, w * 0.14, 1, 0.4);
  }

  fog(ctx, w, h * 0.9, h * 0.22, neglected ? 0.07 : 0.14, neglected ? 5 : 3);
  vignette(ctx, w, h, 0.86);
}

export const paintMansionRoom: ScenePainter = (ctx, w, h) => paintMansionRoomCore(ctx, w, h, false);
export const paintAbandonedRoom: ScenePainter = (ctx, w, h) => paintMansionRoomCore(ctx, w, h, true);

/* -------------------------------------------------------------------------- */
/* The great hall (full-page backdrop)                                         */
/* -------------------------------------------------------------------------- */

export interface HallOptions {
  /** Candles and chandelier burning (true) or guttering low (false). */
  lit: boolean;
}

export function paintMansionHall(ctx: CanvasRenderingContext2D, w: number, h: number, opts: HallOptions): void {
  const { lit } = opts;
  const horizon = h * 0.6;

  // Dark panelled walls
  const wall = ctx.createLinearGradient(0, 0, 0, horizon);
  wall.addColorStop(0, '#0c0707');
  wall.addColorStop(1, '#1b100e');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, horizon);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = Math.max(1, w * 0.002);
  for (let x = 0; x < w; x += w * 0.05) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, horizon);
    ctx.stroke();
  }

  // Chequered marble floor in perspective (solid base first, so nothing is left transparent)
  const floorBase = ctx.createLinearGradient(0, horizon, 0, h);
  floorBase.addColorStop(0, '#0d0909');
  floorBase.addColorStop(1, '#070405');
  ctx.fillStyle = floorBase;
  ctx.fillRect(0, horizon, w, h - horizon);
  const cx = w * 0.5;
  const rows = 14;
  const cols = 70;
  for (let r = 0; r < rows; r++) {
    const t0 = Math.pow(r / rows, 1.7);
    const t1 = Math.pow((r + 1) / rows, 1.7);
    const y0 = horizon + (h - horizon) * t0;
    const y1 = horizon + (h - horizon) * t1;
    const s0 = 0.05 + t0 * 1.6;
    const s1 = 0.05 + t1 * 1.6;
    for (let c = -cols; c < cols; c++) {
      const dark = (c + r) % 2 === 0;
      const a = `rgb(${dark ? '13,10,11' : '33,28,30'})`;
      ctx.fillStyle = a;
      ctx.beginPath();
      ctx.moveTo(cx + c * w * 0.06 * s0, y0);
      ctx.lineTo(cx + (c + 1) * w * 0.06 * s0, y0);
      ctx.lineTo(cx + (c + 1) * w * 0.06 * s1, y1);
      ctx.lineTo(cx + c * w * 0.06 * s1, y1);
      ctx.closePath();
      ctx.fill();
    }
  }
  const sheen = ctx.createLinearGradient(0, horizon, 0, h);
  sheen.addColorStop(0, 'rgba(120,110,120,0.10)');
  sheen.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, horizon, w, h - horizon);

  // Red carpet runner
  ctx.fillStyle = '#5a0f1e';
  ctx.beginPath();
  ctx.moveTo(w * 0.42, h);
  ctx.lineTo(w * 0.58, h);
  ctx.lineTo(w * 0.515, horizon);
  ctx.lineTo(w * 0.485, horizon);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(201,161,90,0.5)';
  ctx.lineWidth = Math.max(1, w * 0.0015);
  ctx.beginPath();
  ctx.moveTo(w * 0.44, h);
  ctx.lineTo(w * 0.495, horizon);
  ctx.moveTo(w * 0.56, h);
  ctx.lineTo(w * 0.505, horizon);
  ctx.stroke();

  // Gothic window with a ghost, above the stairs
  const wx = w * 0.4;
  const wy = h * 0.04;
  const ww = w * 0.12;
  const wh = h * 0.5;
  gothicArch(ctx, wx, wy, ww, wh);
  ctx.save();
  ctx.clip();
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#6f8398');
  sky.addColorStop(1, '#1d2733');
  ctx.fillStyle = sky;
  ctx.fillRect(wx, wy, ww, wh);
  glow(ctx, wx + ww * 0.5, wy + wh * 0.4, ww * 1.2, '170,195,225', 0.45);
  ghostFigure(ctx, wx + ww * 0.5, wy + wh * 0.28, wh * 0.62, lit ? 0.55 : 0.4, false);
  ctx.restore();
  ctx.strokeStyle = '#080505';
  ctx.lineWidth = Math.max(3, w * 0.004);
  gothicArch(ctx, wx, wy, ww, wh);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, w * 0.002);
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy);
  ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.moveTo(wx, wy + wh * 0.45);
  ctx.lineTo(wx + ww, wy + wh * 0.45);
  ctx.stroke();

  // Side arched windows
  [w * 0.27, w * 0.58].forEach((x, i) => {
    gothicArch(ctx, x, h * 0.1, w * 0.07, h * 0.4);
    ctx.fillStyle = i ? '#141c26' : '#18212c';
    ctx.fill();
    ctx.strokeStyle = '#0a0606';
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.stroke();
  });

  // Staircase rising toward the window (a dark stringer underneath so it stands on the floor)
  ctx.fillStyle = '#100807';
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.776);
  ctx.lineTo(w * 0.5, h * 0.396);
  ctx.lineTo(w * 0.6, h * 0.396);
  ctx.lineTo(w * 0.5, h * 0.782);
  ctx.closePath();
  ctx.fill();
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const x0 = w * (0.3 + t * 0.2);
    const y0 = h * (0.74 - t * 0.38);
    ctx.fillStyle = `rgb(${34 - t * 14},${20 - t * 8},${18 - t * 8})`;
    ctx.fillRect(x0, y0, w * 0.2 * (1 - t * 0.5), h * 0.032);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x0, y0 + h * 0.028, w * 0.2 * (1 - t * 0.5), h * 0.006);
  }
  ctx.strokeStyle = '#0a0505';
  ctx.lineWidth = Math.max(2.5, w * 0.004);
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.7);
  ctx.lineTo(w * 0.5, h * 0.3);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, w * 0.0016);
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    ctx.beginPath();
    ctx.moveTo(w * (0.3 + t * 0.2), h * (0.7 - t * 0.4));
    ctx.lineTo(w * (0.3 + t * 0.2), h * (0.76 - t * 0.38));
    ctx.stroke();
  }

  // Chandelier
  const chx = w * 0.64;
  const chy = h * 0.2;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1.5, w * 0.0018);
  ctx.beginPath();
  ctx.moveTo(chx, 0);
  ctx.lineTo(chx, chy - h * 0.04);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.ellipse(chx, chy, w * 0.045, h * 0.012, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(chx - w * 0.04, chy);
  ctx.quadraticCurveTo(chx - w * 0.05, chy + h * 0.06, chx, chy + h * 0.09);
  ctx.quadraticCurveTo(chx + w * 0.05, chy + h * 0.06, chx + w * 0.04, chy);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const x = chx - w * 0.045 + (i / 6) * w * 0.09;
    candle(ctx, x, chy - h * 0.004, h * 0.03, w * 0.004, lit && i !== 3);
  }
  if (lit) glow(ctx, chx, chy, w * 0.2, '255,170,80', 0.22);

  // Portraits and panelling on the right
  [[0.89, 0.06, 0.07, 0.3], [0.8, 0.14, 0.05, 0.2]].forEach(([x, y, pw, ph]) => {
    ctx.fillStyle = GOLD;
    ctx.fillRect(w * x - 4, h * y - 4, w * pw + 8, h * ph + 8);
    ctx.fillStyle = '#120a0a';
    ctx.fillRect(w * x, h * y, w * pw, h * ph);
    ctx.fillStyle = 'rgba(190,170,155,0.55)';
    ctx.beginPath();
    ctx.ellipse(w * (x + pw / 2), h * (y + ph * 0.38), w * pw * 0.16, h * ph * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Gilded mirror with a handprint (left)
  const mx = w * 0.025;
  const my = h * 0.07;
  const mw = w * 0.085;
  const mh = h * 0.52;
  ctx.fillStyle = GOLD;
  gothicArch(ctx, mx - 7, my - 7, mw + 14, mh + 14);
  ctx.fill();
  gothicArch(ctx, mx, my, mw, mh);
  const glass = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
  glass.addColorStop(0, '#46494f');
  glass.addColorStop(1, '#16181c');
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.fillStyle = 'rgba(205,210,220,0.34)'; // handprint
  const hx = mx + mw * 0.5;
  const hy = my + mh * 0.5;
  ctx.beginPath();
  ctx.ellipse(hx, hy + mh * 0.03, mw * 0.2, mh * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  [-0.17, -0.08, 0, 0.08, 0.16].forEach((dx, i) => {
    ctx.beginPath();
    ctx.ellipse(hx + mw * dx, hy - mh * (0.045 + (i === 0 || i === 4 ? 0 : 0.02)), mw * 0.03, mh * 0.045, dx * 0.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Console table: candelabra, rose under glass, books
  const ty = h * 0.74;
  ctx.fillStyle = '#1d110e';
  ctx.fillRect(0, ty, w * 0.15, h * 0.03);
  ctx.fillRect(w * 0.01, ty, w * 0.01, h * 0.24);
  ctx.fillRect(w * 0.13, ty, w * 0.01, h * 0.24);
  ctx.fillStyle = GOLD;
  ctx.fillRect(w * 0.043, ty - h * 0.06, w * 0.004, h * 0.06);
  ctx.fillRect(w * 0.03, ty - h * 0.015, w * 0.03, h * 0.006);
  [0.034, 0.045, 0.056].forEach((x, i) => candle(ctx, w * x, ty - h * (0.06 + (i === 1 ? 0.012 : 0)), h * 0.05, w * 0.005, lit));
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(w * 0.015, ty - h * 0.04, w * 0.026, h * 0.014);
  ctx.fillStyle = '#6a1626';
  ctx.fillRect(w * 0.017, ty - h * 0.052, w * 0.022, h * 0.012);
  const gx = w * 0.105;
  ctx.fillStyle = 'rgba(190,210,225,0.16)';
  ctx.beginPath();
  ctx.ellipse(gx, ty - h * 0.07, w * 0.014, h * 0.062, 0, Math.PI, 0);
  ctx.lineTo(gx + w * 0.014, ty);
  ctx.lineTo(gx - w * 0.014, ty);
  ctx.fill();
  ctx.fillStyle = '#a3182f';
  ctx.beginPath();
  ctx.arc(gx, ty - h * 0.06, w * 0.006, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3b5a38';
  ctx.beginPath();
  ctx.moveTo(gx, ty - h * 0.055);
  ctx.lineTo(gx, ty - h * 0.005);
  ctx.stroke();
  if (lit) glow(ctx, w * 0.045, ty - h * 0.1, w * 0.1, '255,170,80', 0.28);

  cobweb(ctx, 0, 0, w * 0.1, 1, 0.34);
  cobweb(ctx, w, 0, w * 0.08, -1, 0.26);

  fog(ctx, w, h * 0.86, h * 0.26, 0.2, 7);
  fog(ctx, w, h * 0.7, h * 0.18, 0.09, 12);
  // crimson mist at the foot of the page
  const mist = ctx.createLinearGradient(0, h * 0.8, 0, h);
  mist.addColorStop(0, 'rgba(142,27,44,0)');
  mist.addColorStop(1, 'rgba(142,27,44,0.28)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, h * 0.8, w, h * 0.2);
  vignette(ctx, w, h, 0.78);
}

export const paintHallLit: ScenePainter = (ctx, w, h) => paintMansionHall(ctx, w, h, { lit: true });
export const paintHallDim: ScenePainter = (ctx, w, h) => paintMansionHall(ctx, w, h, { lit: false });

export const SCENE_PAINTERS: Record<SceneName, ScenePainter> = {
  room: paintElegantRoom,
  abandoned: paintAbandonedRoom,
  mansion: paintMansionRoom,
};

/** Paint a scene into a fresh canvas. */
export function renderScene(painter: ScenePainter, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(w));
  canvas.height = Math.max(2, Math.round(h));
  const ctx = canvas.getContext('2d');
  if (ctx) painter(ctx, canvas.width, canvas.height);
  return canvas;
}

const sceneCache = new Map<string, HTMLCanvasElement>();
export function getScene(name: SceneName, w: number, h: number): HTMLCanvasElement {
  const key = `${name}:${w}x${h}`;
  let c = sceneCache.get(key);
  if (!c) {
    c = renderScene(SCENE_PAINTERS[name], w, h);
    sceneCache.set(key, c);
  }
  return c;
}

/** Tileable film-grain texture as a data URL (used by CSS overlays). */
export function makeGrainDataUrl(size = 128, seed = 5): string {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const rnd = seeded(seed);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}