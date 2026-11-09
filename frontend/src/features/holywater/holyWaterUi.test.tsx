import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHauntingStore } from '@/features/haunting/hauntingStore';
import { FullscreenVideo } from './FullscreenVideo';
import { AVATAR_SRC, AVATAR_STILL_SRC, GhostAvatar } from './GhostAvatar';
import { RoomViewer } from './RoomViewer';
import { AVATAR_DELAY_MS, BUBBLE_MS, INTRO_MESSAGE } from './copy';
import { useHolyWaterStore } from './holyWaterStore';
import { ROOMS } from './rooms';

const reset = () => {
  sessionStorage.clear();
  useHolyWaterStore.setState({ foundIn: null, scared: false, cured: false, openRoom: null, armed: false, video: 'none' });
  useHauntingStore.setState({ experience: 'haunted', horrorEnabled: true, sequence: 'idle', phase: 'none' });
};
const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const hw = () => useHolyWaterStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  reset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.style.overflow = '';
  reset();
});

describe('GhostAvatar', () => {
  it('appears 3 seconds after the haunted page does, and not before', () => {
    render(<GhostAvatar reducedMotion={false} />);
    expect(AVATAR_DELAY_MS).toBe(3000);
    expect(screen.queryByTestId('ghost-target')).toBeNull();

    wait(AVATAR_DELAY_MS - 1);
    expect(screen.queryByTestId('ghost-target')).toBeNull();
    wait(1);
    expect(screen.getByTestId('ghost-target')).toBeTruthy();
  });

  it('waits for the takeover to finish before counting the 3 seconds', () => {
    useHauntingStore.setState({ sequence: 'running', phase: 'C' });
    render(<GhostAvatar reducedMotion={false} />);
    wait(AVATAR_DELAY_MS * 3);
    expect(screen.queryByTestId('ghost-target')).toBeNull();

    act(() => useHauntingStore.setState({ sequence: 'idle', phase: 'none' }));
    wait(AVATAR_DELAY_MS);
    expect(screen.getByTestId('ghost-target')).toBeTruthy();
  });

  it('asks the visitor to explore the Haunted Styles and collect holy water', () => {
    render(<GhostAvatar reducedMotion={false} />);
    wait(AVATAR_DELAY_MS);
    const bubble = screen.getByTestId('ghost-bubble');
    expect(bubble.getAttribute('role')).toBe('status');
    expect(bubble.dataset.open).toBe('true');
    expect(bubble.textContent).toBe(INTRO_MESSAGE);
  });

  it('puts the intro away after a while, and says it again when the ghost is pressed', () => {
    render(<GhostAvatar reducedMotion={false} />);
    wait(AVATAR_DELAY_MS);
    wait(BUBBLE_MS);
    expect(screen.getByTestId('ghost-bubble').dataset.open).toBe('false');

    fireEvent.click(screen.getByTestId('ghost-target'));
    expect(screen.getByTestId('ghost-bubble').dataset.open).toBe('true');
  });

  it('shows the clue of the open room, and keeps it up while the room is open', () => {
    render(<GhostAvatar reducedMotion={false} />);
    wait(AVATAR_DELAY_MS);
    act(() => hw().openRoomViewer('library'));
    expect(screen.getByTestId('ghost-bubble').textContent).toBe(ROOMS.library.clue);

    wait(BUBBLE_MS * 3);
    expect(screen.getByTestId('ghost-bubble').dataset.open).toBe('true');

    act(() => hw().openRoomViewer('grand-ballroom'));
    expect(screen.getByTestId('ghost-bubble').textContent).toBe(ROOMS['grand-ballroom'].clue);
  });

  it('uses the animated picture, or a still one with reduced motion', () => {
    const { unmount } = render(<GhostAvatar reducedMotion={false} />);
    wait(AVATAR_DELAY_MS);
    expect(screen.getByTestId('ghost-target').querySelector('img')?.getAttribute('src')).toBe(AVATAR_SRC);
    unmount();

    render(<GhostAvatar reducedMotion />);
    wait(AVATAR_DELAY_MS);
    expect(screen.getByTestId('ghost-target').querySelector('img')?.getAttribute('src')).toBe(AVATAR_STILL_SRC);
  });

  it('has no bottle until a holy water is collected', () => {
    render(<GhostAvatar reducedMotion={false} />);
    wait(AVATAR_DELAY_MS);
    expect(screen.queryByTestId('holy-water-slot')).toBeNull();

    act(() => void hw().collect('library'));
    expect(screen.getByTestId('holy-water-slot')).toBeTruthy();
    expect(screen.getByTestId('ghost-bubble').textContent).toMatch(/found the holy water/);
  });

  it('pressing the bottle and then the ghost uses the holy water', () => {
    act(() => void hw().collect('library'));
    render(<GhostAvatar reducedMotion={false} />);
    wait(AVATAR_DELAY_MS);

    const slot = screen.getByTestId('holy-water-slot');
    expect(slot.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(slot);
    expect(slot.getAttribute('aria-pressed')).toBe('true');
    expect(hw().armed).toBe(true);
    expect(screen.getByTestId('ghost-target').dataset.armed).toBe('true');

    fireEvent.click(screen.getByTestId('ghost-target'));
    expect(hw().video).toBe('cure');
  });

  it('pressing the ghost without the bottle in hand does not cure it', () => {
    act(() => void hw().collect('library'));
    render(<GhostAvatar reducedMotion={false} />);
    wait(AVATAR_DELAY_MS);
    fireEvent.click(screen.getByTestId('ghost-target'));
    expect(hw().video).toBe('none');
  });

  it('is gone once it has been dispersed', () => {
    render(<GhostAvatar reducedMotion={false} />);
    wait(AVATAR_DELAY_MS);
    act(() => useHolyWaterStore.setState({ cured: true }));
    expect(screen.queryByTestId('ghost-target')).toBeNull();
  });
});

describe('RoomViewer', () => {
  const open = (id: 'drawing-room' | 'library' | 'grand-ballroom') => act(() => hw().openRoomViewer(id));

  it('shows nothing until a room is opened', () => {
    render(<RoomViewer />);
    expect(screen.queryByTestId('room-viewer')).toBeNull();
  });

  it('shows the full painting of the room that was opened, as a labelled modal dialog', () => {
    render(<RoomViewer />);
    open('grand-ballroom');
    const dialog = screen.getByRole('dialog', { name: 'The Grand Ballroom, enlarged' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const img = screen.getByAltText(ROOMS['grand-ballroom'].alt) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/images/haunted/rooms/grand-ballroom.webp');
  });

  it('hides a bottle in the painting, and collecting it takes it away', () => {
    render(<RoomViewer />);
    open('library');
    const bottle = screen.getByTestId('holy-water-library');
    expect(bottle.style.left).toBe(`${ROOMS.library.bottle.x}%`);
    expect(bottle.style.top).toBe(`${ROOMS.library.bottle.y}%`);

    fireEvent.click(bottle);
    expect(hw().foundIn).toBe('library');
    expect(screen.queryByTestId('holy-water-library')).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/Holy water collected/);
  });

  it('every room has its own bottle', () => {
    render(<RoomViewer />);
    for (const id of ['drawing-room', 'library', 'grand-ballroom'] as const) {
      open(id);
      expect(screen.getByTestId(`holy-water-${id}`)).toBeTruthy();
    }
  });

  it('no more bottles are offered once one is found', () => {
    act(() => void hw().collect('library'));
    render(<RoomViewer />);
    open('drawing-room');
    expect(screen.queryByTestId('holy-water-drawing-room')).toBeNull();
  });

  it('closes with Escape, the close button, or a click outside the painting', () => {
    render(<RoomViewer />);
    open('library');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(hw().openRoom).toBeNull();

    open('library');
    fireEvent.click(screen.getByRole('button', { name: 'Close the room' }));
    expect(hw().openRoom).toBeNull();

    open('library');
    fireEvent.click(screen.getByTestId('room-viewer'));
    expect(hw().openRoom).toBeNull();
  });

  it('does not close when the painting itself is clicked', () => {
    render(<RoomViewer />);
    open('library');
    fireEvent.click(screen.getByAltText(ROOMS.library.alt));
    expect(hw().openRoom).toBe('library');
  });

  it('is modal: the page behind is inert and cannot scroll, until it closes', () => {
    const app = document.createElement('div');
    app.className = 'hf-app';
    document.body.appendChild(app);

    render(<RoomViewer />);
    open('library');
    expect(app.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    act(() => hw().closeRoomViewer());
    expect(app.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).not.toBe('hidden');
    app.remove();
  });

  it('moves focus into the dialog, keeps Tab inside it, and gives focus back on close', () => {
    const opener = document.createElement('button');
    opener.textContent = 'opener';
    document.body.appendChild(opener);
    opener.focus();

    render(<RoomViewer />);
    open('library');
    const close = screen.getByRole('button', { name: 'Close the room' });
    const bottle = screen.getByTestId('holy-water-library');
    expect(document.activeElement).toBe(close);

    close.focus();
    fireEvent.keyDown(window, { key: 'Tab' }); // from the last element, wraps to the first
    expect(document.activeElement).toBe(bottle);
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true }); // from the first, wraps to the last
    expect(document.activeElement).toBe(close);

    act(() => hw().closeRoomViewer());
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('FullscreenVideo', () => {
  const mount = (onDone = vi.fn(), kind: 'scare' | 'cure' = 'scare') => {
    render(<FullscreenVideo kind={kind} src="/video/x.mp4" label="A video." maxMs={5000} onDone={onDone} />);
    return onDone;
  };

  it('is a labelled modal dialog that says how to skip it', () => {
    mount();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('A video. Press Escape to skip.');
    expect(dialog.dataset.kind).toBe('scare');
  });

  it('ends when the video ends, once', () => {
    const onDone = mount();
    const video = document.querySelector('video') as HTMLVideoElement;
    fireEvent.ended(video);
    fireEvent.ended(video);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('ends on Escape', () => {
    const onDone = mount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('ends if the video cannot load, or never finishes', () => {
    const failed = mount();
    fireEvent.error(document.querySelector('video') as HTMLVideoElement);
    expect(failed).toHaveBeenCalledTimes(1);
    cleanup();

    const stuck = mount();
    wait(4999);
    expect(stuck).not.toHaveBeenCalled();
    wait(1);
    expect(stuck).toHaveBeenCalledTimes(1);
  });

  it('the scare has no skip button, the cure has one', () => {
    mount(vi.fn(), 'scare');
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    cleanup();

    const onDone = mount(vi.fn(), 'cure');
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('plays without sound when the browser refuses sound', async () => {
    vi.useRealTimers();
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
      .mockResolvedValue(undefined);
    mount();
    const video = document.querySelector('video') as HTMLVideoElement;
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    expect(video.muted).toBe(true);
    play.mockRestore();
  });
});
