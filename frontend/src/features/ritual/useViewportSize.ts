import { useEffect, useState } from 'react';
import type { Size } from './geometry';

const read = (): Size => (typeof window === 'undefined' ? { width: 1280, height: 720 } : { width: window.innerWidth, height: window.innerHeight });

/** The size of the browser window, kept up to date as it is resized or rotated. */
export function useViewportSize(): Size {
  const [size, setSize] = useState<Size>(read);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = read();
        setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return size;
}
