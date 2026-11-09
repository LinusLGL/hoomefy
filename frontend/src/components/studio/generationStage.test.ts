import { describe, it, expect } from 'vitest';
import type { GenerationJob, JobStatus } from '@/types';
import { stageFromJob } from './generationStage';

const job = (status: JobStatus): GenerationJob => ({
  jobId: 'j',
  userId: 'u',
  projectId: 'p',
  status,
  originalImageKey: 'k',
  generatedImageKey: null,
  roomType: 'bedroom',
  style: 'japandi',
  preferences: {},
  errorMessage: null,
  createdAt: '',
  completedAt: null,
});

describe('stageFromJob (visual stage mirrors the real backend status)', () => {
  it.each([
    [null, 'queued'],
    ['pending', 'queued'],
    ['processing', 'developing'],
    ['completed', 'ready'],
    ['failed', 'failed'],
  ] as const)('%s -> %s', (status, stage) => {
    expect(stageFromJob(status === null ? null : job(status))).toBe(stage);
  });
});
