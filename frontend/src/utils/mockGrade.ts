/**
 * Demo renderer.
 *
 * Colour-grades the visitor's own photograph according to the chosen theme. It is the stand-in used by
 * local development, the automated tests and the "show a demo instead" fallback when the free AI
 * service is busy. It is always labelled as a demo rendering in the UI.
 */

import type { DesignStyle } from '@/types';

interface Grade {
  tint: string;
  alpha: number;
  mode: GlobalCompositeOperation;
  brightness: number; // additive white/black lift, -1..1
}

const GRADES: Record<DesignStyle, Grade> = {
  scandinavian: { tint: '#F3EBDD', alpha: 0.36, mode: 'soft-light', brightness: 0.14 },
  japandi: { tint: '#B5A583', alpha: 0.3, mode: 'soft-light', brightness: 0.02 },
  'modern-luxury': { tint: '#6B4F7A', alpha: 0.28, mode: 'soft-light', brightness: -0.04 },
  minimalist: { tint: '#EDEAE2', alpha: 0.32, mode: 'soft-light', brightness: 0.1 },
  halloween: { tint: '#3A2A3A', alpha: 0.42, mode: 'multiply', brightness: -0.14 },
  custom: { tint: '#C9B99A', alpha: 0.22, mode: 'soft-light', brightness: 0.04 },
};

/** Grades an image blob. Resolves to a JPEG blob, or null when the image cannot be drawn. */
export function gradeBlob(source: Blob, style: DesignStyle, maxWidth = 1280): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      const g = GRADES[style];
      ctx.drawImage(img, 0, 0, w, h);
      ctx.globalCompositeOperation = g.mode;
      ctx.globalAlpha = g.alpha;
      ctx.fillStyle = g.tint;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.abs(g.brightness);
      ctx.fillStyle = g.brightness >= 0 ? '#ffffff' : '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
