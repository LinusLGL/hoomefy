import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HauntedBackdropVideo, BACKDROP_POSTER_SRC, BACKDROP_VIDEO_SRC } from './HauntedBackdropVideo';
import { HauntingContext } from './hauntingEnvContext';
import { useHauntingStore } from './hauntingStore';

function mount(reducedMotion = false) {
  return render(
    <HauntingContext.Provider value={{ reducedMotion, mobile: false }}>
      <HauntedBackdropVideo />
    </HauntingContext.Provider>
  );
}

beforeEach(() => {
  useHauntingStore.setState({ experience: 'haunted', horrorEnabled: true });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
});

describe('HauntedBackdropVideo', () => {
  it('loops a muted video behind the page in the Haunted experience', () => {
    const { container } = mount();
    const video = container.querySelector('video') as HTMLVideoElement;

    expect(video).not.toBeNull();
    expect(video.getAttribute('src')).toBe(BACKDROP_VIDEO_SRC);
    expect(video.getAttribute('poster')).toBe(BACKDROP_POSTER_SRC);
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video.getAttribute('playsinline')).not.toBeNull();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('is hidden from assistive technology and cannot take focus', () => {
    mount();
    const wrap = screen.getByTestId('haunted-backdrop');

    expect(wrap).toHaveAttribute('aria-hidden', 'true');
    expect(wrap.querySelector('video')).toHaveAttribute('tabindex', '-1');
  });

  it('renders nothing in the Elegant experience', () => {
    useHauntingStore.setState({ experience: 'elegant' });
    const { container } = mount();

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when horror effects are off', () => {
    useHauntingStore.setState({ horrorEnabled: false });
    const { container } = mount();

    expect(container.firstChild).toBeNull();
  });

  it('shows only the still poster when the visitor prefers reduced motion', () => {
    const { container } = mount(true);

    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('src', BACKDROP_POSTER_SRC);
  });
});
