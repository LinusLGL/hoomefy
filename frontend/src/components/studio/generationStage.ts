import type { GenerationJob } from '@/types';

export type DevelopStage = 'queued' | 'developing' | 'ready' | 'failed';

/**
 * Pure mapping from the backend job status to the visual stage, so the
 * "developing photograph" can never show something the backend has not reported.
 *
 *   no job yet / pending -> queued       processing -> developing
 *   completed            -> ready        failed     -> failed
 */
export function stageFromJob(job: GenerationJob | null): DevelopStage {
  switch (job?.status) {
    case 'processing':
      return 'developing';
    case 'completed':
      return 'ready';
    case 'failed':
      return 'failed';
    case 'pending':
    default:
      return 'queued';
  }
}
