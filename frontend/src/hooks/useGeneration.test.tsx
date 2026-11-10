import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { AiError, type EditRequest, type EditResult, type ImageEditProvider } from '@/features/studio/ai';
import { useStudioStore } from '@/stores/studioStore';

const provider: { current: ImageEditProvider } = { current: undefined as unknown as ImageEditProvider };

vi.mock('@/features/studio/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/studio/ai')>();
  return { ...actual, getImageProvider: () => provider.current, getDemoProvider: () => provider.current };
});

import { useGeneration, type GenerateInput } from './useGeneration';

const input: GenerateInput = {
  image: new Blob(['photo'], { type: 'image/jpeg' }),
  width: 1024,
  height: 768,
  style: 'japandi',
  preferences: { intensity: 0.5, customInstructions: 'add plants' },
};

const result = (over: Partial<EditResult> = {}): EditResult => ({ blob: new Blob(['made'], { type: 'image/jpeg' }), providerId: 'fake', demo: false, seed: 5, ...over });

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:made'), configurable: true, writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true, writable: true });
  useStudioStore.getState().reset();
});

describe('useGeneration', () => {
  it('sends the prompt and the photo to the provider and stores the finished design', async () => {
    const seen: EditRequest[] = [];
    provider.current = {
      id: 'fake',
      label: 'Fake',
      sendsPhoto: false,
      edit: async (req) => {
        seen.push(req);
        req.onStatus?.({ stage: 'queued', position: 2 });
        req.onStatus?.({ stage: 'running' });
        return result();
      },
    };

    const { result: hook } = renderHook(() => useGeneration());
    let job: Awaited<ReturnType<typeof hook.current.generate>> = null;
    await act(async () => {
      job = await hook.current.generate(input);
    });

    expect(seen[0].image).toBe(input.image);
    expect(seen[0].width).toBe(1024);
    expect(seen[0].style).toBe('japandi');
    expect(seen[0].prompt).toMatch(/^Edit this photograph of a room\./);
    expect(seen[0].prompt).toContain('Japandi');
    // The visitor's own words reach the model as the priority request.
    expect(seen[0].prompt).toContain('request comes first');
    expect(seen[0].prompt).toContain('"add plants"');

    expect(job).toMatchObject({ status: 'completed', style: 'japandi' });
    expect(hook.current.isGenerating).toBe(false);
    expect(hook.current.currentJob?.generatedImageUrl).toBe('blob:made');
    const store = useStudioStore.getState();
    expect(store.history).toHaveLength(1);
    expect(store.history[0]).toMatchObject({ providerId: 'fake', seed: 5, demo: false, style: 'japandi' });
    expect(store.activeVersionId).toBe(store.history[0].id);
  });

  it('shows the real provider stages while it works', async () => {
    let finish: (r: EditResult) => void = () => undefined;
    let statusCb: EditRequest['onStatus'];
    provider.current = {
      id: 'fake',
      label: 'Fake',
      sendsPhoto: false,
      edit: (req) => {
        statusCb = req.onStatus;
        return new Promise<EditResult>((resolve) => {
          finish = resolve;
        });
      },
    };
    const { result: hook } = renderHook(() => useGeneration());
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = hook.current.generate(input);
    });
    expect(hook.current.isGenerating).toBe(true);
    expect(hook.current.currentJob?.status).toBe('pending');

    act(() => statusCb?.({ stage: 'queued', position: 3, etaSeconds: 20 }));
    expect(hook.current.queue).toMatchObject({ position: 3 });
    expect(hook.current.currentJob?.status).toBe('pending');

    act(() => statusCb?.({ stage: 'running' }));
    expect(hook.current.currentJob?.status).toBe('processing');

    await act(async () => {
      finish(result());
      await pending;
    });
    expect(hook.current.currentJob?.status).toBe('completed');
    expect(hook.current.queue).toBeNull();
  });

  it('reports a failure with its reason and keeps earlier designs', async () => {
    provider.current = { id: 'a', label: 'a', sendsPhoto: false, edit: async () => result() };
    const { result: hook } = renderHook(() => useGeneration());
    await act(async () => {
      await hook.current.generate(input);
    });

    provider.current = {
      id: 'b',
      label: 'b',
      sendsPhoto: false,
      edit: async () => {
        throw new AiError('quota', 'The free AI time for today is used up.', 600);
      },
    };
    await act(async () => {
      await hook.current.generate(input);
    });

    expect(hook.current.errorCode).toBe('quota');
    expect(hook.current.error).toMatch(/used up/);
    expect(hook.current.currentJob).toMatchObject({ status: 'failed', errorMessage: expect.stringMatching(/used up/) });
    expect(hook.current.isGenerating).toBe(false);
    expect(useStudioStore.getState().history).toHaveLength(1);
  });

  it('stops quietly when cancelled', async () => {
    provider.current = {
      id: 'fake',
      label: 'Fake',
      sendsPhoto: false,
      edit: (req) =>
        new Promise<EditResult>((_resolve, reject) => {
          req.signal?.addEventListener('abort', () => reject(new AiError('aborted', 'Cancelled.')));
        }),
    };
    const { result: hook } = renderHook(() => useGeneration());
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = hook.current.generate(input);
    });
    await act(async () => {
      await hook.current.cancel();
      await pending;
    });
    expect(hook.current.isGenerating).toBe(false);
    expect(hook.current.currentJob).toBeNull();
    expect(hook.current.error).toBeNull();
    expect(useStudioStore.getState().history).toHaveLength(0);
  });

  it('marks a demo result as a demo', async () => {
    provider.current = { id: 'demo', label: 'Demo', sendsPhoto: false, edit: async () => result({ demo: true, providerId: 'demo' }) };
    const { result: hook } = renderHook(() => useGeneration());
    await act(async () => {
      await hook.current.generate({ ...input, demo: true });
    });
    expect(useStudioStore.getState().history[0].demo).toBe(true);
  });
});
