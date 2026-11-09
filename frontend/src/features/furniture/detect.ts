/**
 * Finding furniture in the finished design, on the visitor's own device.
 *
 * A small zero-shot detector (OWL-ViT) is given the names of the pieces we know about and returns boxes.
 * It runs in the browser, so the design never leaves the device for this step, it costs no free GPU time
 * and it works even when the AI service is busy. The first run downloads the model (about 150 MB, then
 * cached by the browser), which is why detection starts only when the visitor asks for it.
 *
 * `postProcess` is pure and unit tested; the model itself sits behind a `DetectorRunner`.
 */

import { FURNITURE, FURNITURE_IDS, type FurnitureKindId } from './taxonomy';

/** Fractions of the picture, 0 to 1. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DetectedPiece {
  kind: FurnitureKindId;
  confidence: number;
  box: Box;
}

export interface RawDetection {
  label: string;
  score: number;
  /** Corner coordinates as fractions of the picture. */
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

export interface DetectProgress {
  stage: 'loading' | 'detecting';
  /** 0 to 100 while the model downloads. */
  percent?: number;
}

export type DetectorRunner = (image: Blob, labels: string[], onProgress?: (p: DetectProgress) => void) => Promise<RawDetection[]>;

export const DETECT_LABELS: string[] = FURNITURE_IDS.map((id) => FURNITURE[id].detectLabel);

const LABEL_TO_KIND = new Map<string, FurnitureKindId>(FURNITURE_IDS.map((id) => [FURNITURE[id].detectLabel, id]));

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const area = (b: Box) => b.w * b.h;

function iou(a: Box, b: Box): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = area(a) + area(b) - inter;
  return union <= 0 ? 0 : inter / union;
}

export interface PostProcessOptions {
  minScore?: number;
  /** Boxes that overlap this much are the same object seen as two kinds (sofa and armchair): keep the best. */
  overlap?: number;
  perKind?: number;
  max?: number;
}

/** Turns raw detections into a short, de-duplicated list of pieces. */
export function postProcess(raw: RawDetection[], { minScore = 0.12, overlap = 0.55, perKind = 2, max = 10 }: PostProcessOptions = {}): DetectedPiece[] {
  const candidates: DetectedPiece[] = [];
  for (const d of raw) {
    const kind = LABEL_TO_KIND.get(d.label);
    if (!kind || d.score < minScore) continue;
    const x = clamp01(d.box.xmin);
    const y = clamp01(d.box.ymin);
    const w = clamp01(d.box.xmax) - x;
    const h = clamp01(d.box.ymax) - y;
    if (w <= 0.01 || h <= 0.01) continue;
    candidates.push({ kind, confidence: d.score, box: { x, y, w, h } });
  }
  candidates.sort((a, b) => b.confidence - a.confidence);

  const kept: DetectedPiece[] = [];
  const perKindCount = new Map<FurnitureKindId, number>();
  for (const c of candidates) {
    if ((perKindCount.get(c.kind) ?? 0) >= perKind) continue;
    if (kept.some((k) => iou(k.box, c.box) >= overlap)) continue;
    kept.push(c);
    perKindCount.set(c.kind, (perKindCount.get(c.kind) ?? 0) + 1);
    if (kept.length >= max) break;
  }
  return kept;
}

export async function detectFurniture(image: Blob, run: DetectorRunner, onProgress?: (p: DetectProgress) => void): Promise<DetectedPiece[]> {
  const raw = await run(image, DETECT_LABELS, onProgress);
  return postProcess(raw);
}
