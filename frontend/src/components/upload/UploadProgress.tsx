/**
 * UploadProgress Component
 * 
 * Displays upload progress with percentage and loading bar.
 */

import { Loader2, Upload } from 'lucide-react';
import { cn } from '@/utils/cn';

interface UploadProgressProps {
  progress: number;
  fileName: string;
  className?: string;
}

export function UploadProgress({ progress, fileName, className }: UploadProgressProps) {
  return (
    <div className={cn('bg-navy-900 border border-navy-700 rounded-lg p-6 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
          {progress < 100 ? (
            <Loader2 className="w-5 h-5 text-accent animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-accent" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ivory truncate">{fileName}</p>
          <p className="text-xs text-ivory/70">
            {progress < 100 ? 'Uploading...' : 'Upload complete'}
          </p>
        </div>
        <div className="text-lg font-semibold text-accent">{progress}%</div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-navy-700 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status Text */}
      {progress < 100 && (
        <p className="text-xs text-ivory/75 text-center">
          Please wait while we upload your image...
        </p>
      )}
    </div>
  );
}
