/**
 * Demo provider: no network, no AI. It waits like a real queue would, then colour-grades the photograph.
 */

import { gradeBlob } from '@/utils/mockGrade';
import { AiError, type EditRequest, type EditResult, type ImageEditProvider } from './types';

export interface MockProviderOptions {
  queuedMs?: number;
  runningMs?: number;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AiError('aborted', 'Cancelled.'));
    const id = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      reject(new AiError('aborted', 'Cancelled.'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function createMockProvider({ queuedMs = 700, runningMs = 1600 }: MockProviderOptions = {}): ImageEditProvider {
  return {
    id: 'demo',
    label: 'Demo renderer',
    sendsPhoto: false,
    async edit(request: EditRequest): Promise<EditResult> {
      request.onStatus?.({ stage: 'queued', position: 1 });
      await wait(queuedMs, request.signal);
      request.onStatus?.({ stage: 'running' });
      await wait(runningMs, request.signal);
      const graded = await gradeBlob(request.image, request.style ?? 'custom');
      if (!graded) throw new AiError('invalid', 'The demo renderer could not read this photo.');
      return { blob: graded, seed: request.seed, providerId: 'demo', demo: true };
    },
  };
}
