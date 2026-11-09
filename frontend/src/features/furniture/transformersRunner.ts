/**
 * The real detector: OWL-ViT through transformers.js, loaded only when the visitor asks for it.
 *
 * The library is fetched from jsDelivr at that moment, pinned to one exact version, instead of being
 * part of the site's own files. Its WebAssembly runtime is over 25 MiB, which is more than a single
 * Cloudflare Pages file may be, and most visitors never use detection, so they never download it.
 * Kept in its own file so none of this touches the first page load.
 */

import type { DetectorRunner, RawDetection } from './detect';

export const TRANSFORMERS_VERSION = '3.8.1';
export const TRANSFORMERS_URL = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}`;
const MODEL = 'Xenova/owlvit-base-patch32';

type Detector = (image: unknown, labels: string[], options: Record<string, unknown>) => Promise<Array<{ label: string; score: number; box: RawDetection['box'] }>>;

interface TransformersModule {
  env: { allowLocalModels: boolean };
  pipeline(task: string, model: string, options: Record<string, unknown>): Promise<unknown>;
  RawImage: { fromBlob(blob: Blob): Promise<unknown> };
}

let loading: Promise<{ detector: Detector; RawImage: TransformersModule['RawImage'] }> | null = null;

export const runWithTransformers: DetectorRunner = async (image, labels, onProgress) => {
  if (!loading) {
    onProgress?.({ stage: 'loading', percent: 0 });
    loading = (async () => {
      const mod = (await import(/* @vite-ignore */ TRANSFORMERS_URL)) as TransformersModule;
      mod.env.allowLocalModels = false;
      const files = new Map<string, number>();
      let lastPercent = -1;
      const detector = (await mod.pipeline('zero-shot-object-detection', MODEL, {
        dtype: 'q8',
        // The 8-bit model uses operators the WebGPU backend lacks, so always run it on WebAssembly.
        device: 'wasm',
        progress_callback: (p: { status?: string; file?: string; progress?: number }) => {
          if (p.status === 'progress' && p.file && typeof p.progress === 'number') {
            files.set(p.file, p.progress);
            // The library reports every few kilobytes; only tell the page when the number moves.
            const percent = Math.round(Math.min(...files.values()));
            if (percent !== lastPercent) {
              lastPercent = percent;
              onProgress?.({ stage: 'loading', percent });
            }
          }
        },
      })) as Detector;
      return { detector, RawImage: mod.RawImage };
    })().catch((err) => {
      loading = null;
      throw err;
    });
  }

  const { detector, RawImage } = await loading;
  onProgress?.({ stage: 'detecting' });
  const raw = await RawImage.fromBlob(image);
  const out = await detector(raw, labels, { threshold: 0.1, topk: 40, percentage: true });
  return out.map((d) => ({ label: d.label, score: d.score, box: d.box }));
};
