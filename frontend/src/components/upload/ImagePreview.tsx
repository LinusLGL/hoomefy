/**
 * ImagePreview Component
 * 
 * Displays uploaded image with edit controls.
 */

import { useState } from 'react';
import { X, RotateCw, Download, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ImagePreviewProps {
  src: string;
  fileName: string;
  fileSize: number;
  dimensions?: { width: number; height: number };
  onRemove: () => void;
  onRotate?: () => void;
  className?: string;
}

export function ImagePreview({
  src,
  fileName,
  fileSize,
  dimensions,
  onRemove,
  onRotate,
  className,
}: ImagePreviewProps) {
  const [rotation, setRotation] = useState(0);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    onRotate?.();
  };

  return (
    <div className={cn('relative lg:flex lg:flex-col', className)}>
      {/* Image Container */}
      <div className="relative bg-navy-800 rounded-lg overflow-hidden lg:min-h-0 lg:flex-1">
        <img
          src={src}
          alt={fileName}
          className="w-full h-auto object-contain max-h-[500px] lg:absolute lg:inset-0 lg:h-full lg:max-h-none"
          style={{ transform: `rotate(${rotation}deg)` }}
        />

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="absolute top-3 right-3 w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
          aria-label="Remove image"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Badge */}
        <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium shadow-lg">
          <Check className="w-4 h-4" />
          Uploaded
        </div>
      </div>

      {/* Image Info */}
      <div className="mt-4 bg-navy-900 border border-navy-700 rounded-lg p-4 space-y-3 lg:mt-2 lg:shrink-0 lg:space-y-0 lg:p-2.5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ivory truncate">{fileName}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-ivory/70">
              <span>{formatFileSize(fileSize)}</span>
              {dimensions && (
                <>
                  <span>•</span>
                  <span>
                    {dimensions.width} × {dimensions.height}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onRotate && (
              <button
                onClick={handleRotate}
                className="p-2 hover:bg-navy-800 rounded-md transition-colors"
                aria-label="Rotate image"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4 text-ivory/70" />
              </button>
            )}
            <a
              href={src}
              download={fileName}
              className="p-2 hover:bg-navy-800 rounded-md transition-colors"
              aria-label="Download image"
              title="Download"
            >
              <Download className="w-4 h-4 text-ivory/70" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
