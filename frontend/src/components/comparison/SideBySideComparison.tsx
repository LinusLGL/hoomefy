/**
 * SideBySideComparison Component
 * 
 * Side-by-side view of before and after images.
 */

import { cn } from '@/utils/cn';

interface SideBySideComparisonProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  vertical?: boolean;
  className?: string;
}

export function SideBySideComparison({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After',
  vertical = false,
  className,
}: SideBySideComparisonProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        vertical ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2',
        className
      )}
    >
      {/* Before Image */}
      <div className="relative group">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-navy-800">
          <img
            src={beforeImage}
            alt={beforeLabel}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <h3 className="text-white font-semibold text-lg">{beforeLabel}</h3>
            <span className="bg-gray-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              Original
            </span>
          </div>
        </div>
      </div>

      {/* After Image */}
      <div className="relative group">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-navy-800">
          <img
            src={afterImage}
            alt={afterLabel}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <h3 className="text-white font-semibold text-lg">{afterLabel}</h3>
            <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              Transformed
            </span>
          </div>

          {/* AI Badge */}
          <div className="absolute top-4 right-4 bg-amber-600 text-on-accent px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            AI Generated
          </div>
        </div>
      </div>
    </div>
  );
}
