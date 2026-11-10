/**
 * UploadContainer
 *
 * Complete photo workflow: choose -> read on this device -> preview. The studio store is the source of
 * truth for the photograph so the preview survives navigating away from and back to the studio.
 *
 * The file input always exists (hidden while a photo is shown) so the "Replace photo" button in the
 * controls panel can open the same file chooser.
 */

import { useEffect } from 'react';
import { ImageUpload } from './ImageUpload';
import { ImagePreview } from './ImagePreview';
import { UploadProgress } from './UploadProgress';
import { PrivacyNote } from './PrivacyNote';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useStudioStore } from '@/stores/studioStore';
import { useHauntingStore } from '@/features/haunting/hauntingStore';

export const FILE_INPUT_ID = 'file-input';

interface UploadContainerProps {
  /** Hide everything but the (hidden) file input, for when the canvas already shows the design. */
  collapsed?: boolean;
}

export function UploadContainer({ collapsed = false }: UploadContainerProps) {
  const { isUploading, uploadProgress, upload, clear } = useImageUpload();
  const storedImage = useStudioStore((s) => s.uploadedImage);
  const setBusy = useHauntingStore((s) => s.setBusy);

  // An in-flight upload must never be interrupted by a takeover.
  useEffect(() => {
    setBusy('upload', isUploading);
    return () => setBusy('upload', false);
  }, [isUploading, setBusy]);

  const showDropzone = !storedImage && !isUploading;

  return (
    <div className="hf-evidence w-full space-y-4 p-1 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-2" hidden={collapsed}>
      <span className="hf-pin hf-pin--tl" aria-hidden="true" />
      <span className="hf-pin hf-pin--tr" aria-hidden="true" />

      <div hidden={!showDropzone} className="lg:min-h-0 lg:flex-1">
        <ImageUpload onImageSelect={upload} inputId={FILE_INPUT_ID} />
      </div>

      {isUploading && <UploadProgress progress={uploadProgress} fileName="Your room photo" />}

      {storedImage && !isUploading && (
        <ImagePreview
          className="lg:min-h-0 lg:flex-1"
          src={storedImage.preview}
          fileName={storedImage.file.name}
          fileSize={storedImage.file.size}
          dimensions={
            storedImage.originalWidth && storedImage.originalHeight
              ? { width: storedImage.originalWidth, height: storedImage.originalHeight }
              : undefined
          }
          onRemove={clear}
        />
      )}

      <PrivacyNote className="flex items-start gap-2 text-xs text-ivory/70 lg:shrink-0" />
    </div>
  );
}
