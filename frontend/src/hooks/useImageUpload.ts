/**
 * useImageUpload
 *
 * Reads the chosen photograph on this device: checks it, straightens it, strips its metadata and makes
 * the compressed copy used for the AI. Nothing is sent over the network here.
 */

import { useState, useCallback } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { createBrowserBackend } from '@/features/studio/image/browserBackend';
import { ImageError, prepareImage } from '@/features/studio/image/prepareImage';
import { useToast } from './useToast';

export interface UseImageUploadResult {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  upload: (file: File) => Promise<void>;
  clear: () => void;
}

export function useImageUpload(): UseImageUploadResult {
  const toast = useToast();
  const setUploadedImage = useStudioStore((s) => s.setUploadedImage);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setUploadProgress(0);
      setIsUploading(true);
      try {
        const prepared = await prepareImage(file, createBrowserBackend(), (percent) => setUploadProgress(percent));
        setUploadedImage({
          file: prepared.original,
          preview: prepared.previewUrl,
          inference: prepared.inference,
          width: prepared.width,
          height: prepared.height,
          originalWidth: prepared.originalWidth,
          originalHeight: prepared.originalHeight,
        });
        toast.success('Photo ready', 'Location data was removed and the photo was straightened.');
      } catch (err) {
        const message = err instanceof ImageError || err instanceof Error ? err.message : 'We could not read this photo.';
        setError(message);
        toast.error('This photo cannot be used', message);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [toast, setUploadedImage]
  );

  const clear = useCallback(() => {
    setUploadedImage(null);
    setError(null);
    setUploadProgress(0);
  }, [setUploadedImage]);

  return { isUploading, uploadProgress, error, upload, clear };
}
