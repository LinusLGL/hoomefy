/**
 * BeforeAfterSlider Component
 *
 * Interactive slider for comparing before and after images. Drag with a mouse or
 * finger, or focus the handle and use the arrow keys (Home/End jump to the ends).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  /**
   * On laptop and desktop screens (1024px and wider) fill the height of the parent and show the whole
   * photograph instead of a cropped 16:9 frame. Smaller screens are not affected.
   */
  fitHeight?: boolean;
}

const KEY_STEP = 5;

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className,
  fitHeight = false,
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const moveTo = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    setSliderPosition(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  useEffect(() => {
    if (!isDragging) return undefined;
    const onMouseMove = (e: MouseEvent) => moveTo(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      moveTo(e.touches[0].clientX);
    };
    const stop = () => setIsDragging(false);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', stop);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', stop);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', stop);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', stop);
    };
  }, [isDragging, moveTo]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        setSliderPosition((p) => clamp(p - KEY_STEP));
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        setSliderPosition((p) => clamp(p + KEY_STEP));
        break;
      case 'Home':
        setSliderPosition(0);
        break;
      case 'End':
        setSliderPosition(100);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full aspect-video overflow-hidden rounded-lg select-none', fitHeight && 'lg:aspect-auto lg:h-full', className)}
      style={{ touchAction: 'none' }}
    >
      {/* After Image (full) */}
      <div className="absolute inset-0">
        <img src={afterImage} alt={afterLabel} className={cn('h-full w-full object-cover', fitHeight && 'lg:object-contain')} />
        <div className="absolute right-4 top-4 rounded-full bg-green-700 px-3 py-1 text-sm font-semibold text-white shadow-lg">
          {afterLabel}
        </div>
      </div>

      {/* Before Image (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
        <img src={beforeImage} alt={beforeLabel} className={cn('h-full w-full object-cover', fitHeight && 'lg:object-contain')} />
        <div className="absolute left-4 top-4 rounded-full bg-gray-700 px-3 py-1 text-sm font-semibold text-white shadow-lg">
          {beforeLabel}
        </div>
      </div>

      {/* Divider + handle */}
      <div
        className="absolute bottom-0 top-0 w-1 cursor-ew-resize bg-white shadow-lg"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label={`Compare ${beforeLabel} and ${afterLabel}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(sliderPosition)}
          aria-valuetext={`${Math.round(sliderPosition)}% ${beforeLabel}`}
          onKeyDown={onKeyDown}
          className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-white shadow-xl active:cursor-grabbing focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500"
        >
          <MoveHorizontal className="h-5 w-5 text-gray-900" aria-hidden="true" />
        </div>
      </div>

      {!isDragging && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <div className="rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur-sm">
            Drag the slider to compare
          </div>
        </div>
      )}
    </div>
  );
}
