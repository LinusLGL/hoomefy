/**
 * useGeneration
 *
 * Runs one design: builds the prompt from the studio choices, asks the image provider to edit the
 * visitor's photograph, follows its queue and progress, and stores the finished image as a new
 * version in the studio history.
 *
 * The `currentJob` it exposes keeps the shape the progress panel and the haunted mansion already use
 * (pending -> processing -> completed | failed), so the stage shown is always the provider's real state.
 */

import { useState, useCallback, useRef } from 'react';
import type { DesignPreferences, DesignStyle, GenerationJob } from '@/types';
import { useStudioStore } from '@/stores/studioStore';
import { buildEditPrompt, cleanText } from '@/features/studio/prompt';
import { toJpeg } from '@/features/studio/image/toJpeg';
import { AiError, getDemoProvider, getImageProvider, type AiErrorCode, type EditStatus } from '@/features/studio/ai';
import { useToast } from './useToast';

export interface GenerateInput {
  /** The EXIF-free photograph to edit. */
  image: Blob;
  width: number;
  height: number;
  style: DesignStyle;
  preferences: DesignPreferences;
  /** Use the demo renderer even when the real model is configured. */
  demo?: boolean;
  /** Repeat an earlier result. Left out, every run is new. */
  seed?: number;
}

export type GeneratedJob = GenerationJob & { generatedImageUrl?: string };

export interface UseGenerationResult {
  isGenerating: boolean;
  currentJob: GeneratedJob | null;
  error: string | null;
  errorCode: AiErrorCode | null;
  /** Queue position and estimate while the free GPU is busy. */
  queue: EditStatus | null;
  generate: (input: GenerateInput) => Promise<GeneratedJob | null>;
  cancel: () => Promise<void>;
  clear: () => void;
}

const newJobId = () => `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function useGeneration(): UseGenerationResult {
  const toast = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<GeneratedJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AiErrorCode | null>(null);
  const [queue, setQueue] = useState<EditStatus | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const generate = useCallback(
    async (input: GenerateInput): Promise<GeneratedJob | null> => {
      const controller = new AbortController();
      abortRef.current = controller;
      cancelledRef.current = false;
      setError(null);
      setErrorCode(null);
      setQueue(null);
      setIsGenerating(true);

      const prompt = buildEditPrompt({
        style: input.style,
        customStyle: input.preferences.customStyle,
        intensity: input.preferences.intensity,
        instructions: input.preferences.customInstructions,
      });

      const job: GeneratedJob = {
        jobId: newJobId(),
        userId: 'guest',
        projectId: 'unsaved',
        status: 'pending',
        originalImageKey: '',
        generatedImageKey: null,
        style: input.style,
        preferences: input.preferences,
        errorMessage: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      setCurrentJob(job);

      const provider = input.demo ? getDemoProvider() : getImageProvider();

      try {
        const result = await provider.edit({
          image: input.image,
          prompt,
          width: input.width,
          height: input.height,
          seed: input.seed,
          style: input.style,
          signal: controller.signal,
          onStatus: (status) => {
            if (cancelledRef.current) return;
            setQueue(status);
            setCurrentJob((prev) => (prev ? { ...prev, status: status.stage === 'running' ? 'processing' : 'pending' } : prev));
          },
        });
        if (cancelledRef.current) return null;

        const blob = await toJpeg(result.blob);
        const url = URL.createObjectURL(blob);
        const versionId = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        useStudioStore.getState().addVersion({
          id: versionId,
          url,
          blob,
          createdAt: new Date().toISOString(),
          style: input.style,
          prompt,
          seed: result.seed,
          providerId: result.providerId,
          demo: result.demo,
        });

        const done: GeneratedJob = {
          ...job,
          status: 'completed',
          generatedImageKey: versionId,
          generatedImageUrl: url,
          completedAt: new Date().toISOString(),
        };
        setCurrentJob(done);
        if (result.demo) {
          const hasWishes = cleanText(input.preferences.customInstructions).length > 0;
          toast.info(
            'Demo rendering ready',
            hasWishes ? 'This is a colour-graded preview. Only the real AI can follow your wishes.' : 'This is a colour-graded preview, not an AI redesign.'
          );
        }
        else toast.success('Your design is ready!', 'Compare the before and after below.');
        return done;
      } catch (err) {
        if (cancelledRef.current || (err instanceof AiError && err.code === 'aborted')) return null;
        const code = err instanceof AiError ? err.code : 'unavailable';
        const message = err instanceof Error ? err.message : 'Generation failed. Please try again.';
        setError(message);
        setErrorCode(code);
        setCurrentJob({ ...job, status: 'failed', errorMessage: message });
        toast.error('We could not finish this design', message);
        return null;
      } finally {
        setIsGenerating(false);
        setQueue(null);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [toast]
  );

  const cancel = useCallback(async () => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
    setCurrentJob(null);
    setQueue(null);
    toast.info('Generation canceled', 'No design was made.');
  }, [toast]);

  const clear = useCallback(() => {
    setCurrentJob(null);
    setError(null);
    setErrorCode(null);
  }, []);

  return { isGenerating, currentJob, error, errorCode, queue, generate, cancel, clear };
}
