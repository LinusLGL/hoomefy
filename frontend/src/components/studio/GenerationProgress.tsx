/**
 * GenerationProgress
 *
 * Inline panel (not a full-screen overlay, so navigation and controls stay
 * reachable) shown while an AI job runs. In the Haunted experience the user's own
 * photograph slowly "develops" out of the dark. The stage shown is derived
 * directly from the real job status, never from a timer:
 *
 *   no job yet / pending -> queued       processing -> developing
 *   completed            -> ready        failed     -> failed
 *
 * While the free GPU is busy the panel also shows the real queue position, and a failed run offers
 * ways forward: try again, or show a demo rendering instead.
 */

import { Loader2 } from 'lucide-react';
import type { GenerationJob } from '@/types';
import { useIsHaunted } from '@/features/haunting/hauntingStore';
import type { AiErrorCode, EditStatus } from '@/features/studio/ai';
import { Button } from '@/components/ui/button';
import { getStudioCopy } from './studioCopy';
import { stageFromJob } from './generationStage';
import { cn } from '@/utils/cn';

interface GenerationProgressProps {
  job: GenerationJob | null;
  /** The user's uploaded photograph (preview URL). */
  imageSrc: string | null;
  onCancel?: () => void;
  queue?: EditStatus | null;
  errorCode?: AiErrorCode | null;
  onRetry?: () => void;
  /** Offered when the live AI service could not be used. */
  onDemo?: () => void;
}

export function GenerationProgress({ job, imageSrc, onCancel, queue = null, errorCode = null, onRetry, onDemo }: GenerationProgressProps) {
  const haunted = useIsHaunted();
  const copy = getStudioCopy(haunted);
  const stage = stageFromJob(job);
  const active = stage === 'queued' || stage === 'developing';
  const waiting = stage === 'queued' && queue?.position !== undefined && queue.position > 1;
  const canShowDemo = stage === 'failed' && onDemo && errorCode !== 'invalid';

  return (
    <section
      className="rounded-xl border border-navy-700 bg-navy-800 p-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:p-4"
      role="status"
      aria-live="polite"
      aria-busy={active}
      data-stage={stage}
      data-testid="generation-progress"
    >
      <div className="flex items-center gap-3">
        {active && <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden="true" />}
        <h3 className="font-heading text-xl font-semibold text-ivory lg:text-lg">{stage === 'failed' ? copy.stages.failed : copy.generatingTitle}</h3>
      </div>
      <p className="mt-1 text-sm text-ivory/75" data-testid="generation-stage">
        {stage === 'failed' ? (job?.errorMessage ?? copy.stages.failed) : copy.stages[stage]}
      </p>
      {waiting && (
        <p className="mt-1 text-sm text-ivory/75" data-testid="generation-queue">
          {queue?.position} people are ahead of you in the free queue
          {queue?.etaSeconds ? `, about ${Math.max(1, Math.round(queue.etaSeconds))} seconds` : ''}.
        </p>
      )}

      {imageSrc && (
        <div className={cn('mt-5 lg:relative lg:mt-3 lg:min-h-0 lg:flex-1', haunted ? 'hf-develop hf-develop--fit' : 'overflow-hidden rounded-lg')} data-stage={stage}>
          <img
            src={imageSrc}
            alt=""
            className={cn(!haunted && 'max-h-[46vh] w-full object-cover lg:absolute lg:inset-0 lg:h-full lg:max-h-none lg:object-contain', !haunted && active && 'opacity-80')}
          />
        </div>
      )}

      {active && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-5 min-h-[44px] rounded-md px-3 text-sm font-medium text-ivory/80 underline-offset-4 hover:text-ivory hover:underline lg:mt-2 lg:shrink-0 lg:self-start"
        >
          Cancel
        </button>
      )}

      {stage === 'failed' && (onRetry || canShowDemo) && (
        <div className="mt-5 flex flex-wrap gap-3 lg:mt-3 lg:shrink-0">
          {onRetry && (
            <Button type="button" size="sm" onClick={onRetry} data-testid="retry-generation">
              Try again
            </Button>
          )}
          {canShowDemo && (
            <Button type="button" size="sm" variant="secondary" onClick={onDemo} data-testid="demo-generation">
              Show a demo rendering instead
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
