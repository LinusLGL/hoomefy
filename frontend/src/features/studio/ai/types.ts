/**
 * The contract between the studio and whatever turns a room photograph into a redesigned one.
 * The studio only knows this interface, so the real model, the demo renderer and test fakes are
 * interchangeable.
 */

import type { DesignStyle } from '@/types';

export type AiErrorCode =
  /** The free GPU time for today is used up. */
  | 'quota'
  /** Too many people are using the free service right now. */
  | 'busy'
  /** The service cannot be reached or is switched off. */
  | 'unavailable'
  | 'timeout'
  | 'aborted'
  /** The request was refused, for example by the service's safety filter. */
  | 'invalid';

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export interface EditStatus {
  stage: 'queued' | 'running';
  /** Place in the queue when waiting. */
  position?: number;
  etaSeconds?: number;
}

export interface EditRequest {
  /** The EXIF-free photograph to edit. */
  image: Blob;
  prompt: string;
  width: number;
  height: number;
  /** Fix the seed to repeat a result. Left out, a new design is made every time. */
  seed?: number;
  /** Only the demo renderer uses this, to pick its colour grade. */
  style?: DesignStyle;
  signal?: AbortSignal;
  onStatus?: (status: EditStatus) => void;
}

export interface EditResult {
  blob: Blob;
  seed?: number;
  providerId: string;
  /** True for a colour-graded stand-in rather than an AI redesign. */
  demo: boolean;
}

export interface ImageEditProvider {
  id: string;
  label: string;
  /** True when the photograph leaves the device, so the visitor must be told first. */
  sendsPhoto: boolean;
  edit(request: EditRequest): Promise<EditResult>;
}
