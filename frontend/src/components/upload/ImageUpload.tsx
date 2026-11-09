/**
 * ImageUpload Component
 * 
 * Drag-and-drop image upload with file selection fallback.
 */

import { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useIsHaunted } from '@/features/haunting/hauntingStore';
import { getStudioCopy } from '@/components/studio/studioCopy';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  disabled?: boolean;
  /** Id of the file input, so other buttons can open the same chooser. */
  inputId?: string;
}

export function ImageUpload({
  onImageSelect,
  maxSizeMB = 10,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  disabled = false,
  inputId = 'file-input',
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = getStudioCopy(useIsHaunted());

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      return 'Invalid file type. Please upload a JPEG, PNG, or WebP image.';
    }

    // Check file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File is too large. Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  };

  const handleFile = (file: File) => {
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    onImageSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleClick = () => {
    if (!disabled) {
      document.getElementById(inputId)?.click();
    }
  };

  return (
    <div className="w-full">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer',
          'flex flex-col items-center justify-center gap-4 min-h-[300px]',
          isDragging && !disabled
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-navy-600 hover:border-amber-500 hover:bg-navy-800',
          disabled && 'opacity-50 cursor-not-allowed hover:border-navy-600 hover:bg-transparent',
          error && 'border-danger'
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
            isDragging && !disabled ? 'bg-amber-500/20' : 'bg-navy-800'
          )}
        >
          {isDragging ? (
            <Upload className="w-8 h-8 text-accent" />
          ) : (
            <ImageIcon className="w-8 h-8 text-ivory/70" />
          )}
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-ivory">
            {isDragging ? 'Drop your image here' : copy.uploadHeadline}
          </p>
          <p className="text-sm text-ivory/70">
            {copy.uploadHint}
          </p>
          <p className="text-xs text-ivory/75">
            JPEG, PNG or WebP • up to {maxSizeMB} MB • at least 512×512 px
          </p>
        </div>

        {/* Browse Button */}
        {!isDragging && (
          <Button variant="secondary" disabled={disabled}>
            Browse Files
          </Button>
        )}

        {/* Hidden File Input */}
        <input
          id={inputId}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-danger text-sm">
          <X className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
