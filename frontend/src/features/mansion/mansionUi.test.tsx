import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { FurnitureKey, RoomType } from '@/types';
import { GlitchText } from '@/features/haunting/GlitchText';
import { FurniturePicker } from './FurniturePicker';
import { MansionProgress } from './MansionProgress';
import { OutcomeBanner } from './OutcomeBanner';
import { SpiritOverlay } from './SpiritOverlay';
import { SpiritReport } from './SpiritReport';
import { activeHouse, useMansionStore, type JobOutcome } from './mansionStore';
import { ROOM_SLOTS } from './spirits';

const store = () => useMansionStore.getState();

beforeEach(() => {
  window.localStorage.clear();
  store().reset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Picker({ bound = [], roomType = 'bedroom' }: { bound?: FurnitureKey[]; roomType?: RoomType }) {
  const [sel, setSel] = useState<FurnitureKey[]>([]);
  return <FurniturePicker title="Furniture to replace" hint="hint" roomType={roomType} selected={sel} onChange={setSel} boundSpirits={bound} />;
}

describe('FurniturePicker', () => {
  it('only offers furniture that exists in the chosen room', () => {
    render(<Picker roomType="kitchen" />);
    expect(screen.queryByRole('button', { name: /Bed & bedding/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Tables/ })).toBeInTheDocument();
  });

  it('toggles a category on and off, exposing the state to assistive tech', async () => {
    const user = userEvent.setup();
    render(<Picker />);
    const lamps = screen.getByRole('button', { name: /Lamps & lighting/ });
    expect(lamps).toHaveAttribute('aria-pressed', 'false');
    await user.click(lamps);
    expect(lamps).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    await user.click(lamps);
    expect(lamps).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('1 selected')).toBeNull();
  });

  it('marks furniture a spirit is bound to, in text as well as with an icon', () => {
    render(<Picker bound={['lighting']} />);
    const lamps = screen.getByRole('button', { name: /Lamps & lighting/ });
    expect(lamps).toHaveAttribute('data-bound', 'true');
    expect(within(lamps).getByText(/a spirit is bound to this/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rugs & curtains/ })).not.toHaveAttribute('data-bound');
  });

  it('shows no ghost language at all when no spirits are bound (the Elegant experience)', () => {
    render(<Picker />);
    expect(document.body.textContent).not.toMatch(/spirit|ghost|haunt/i);
  });

  it('every option is at least 44px tall', () => {
    render(<Picker />);
    for (const b of screen.getAllByRole('button')) expect(b.className).toContain('min-h-[44px]');
  });
});

describe('SpiritReport', () => {
  it('lists the spirits of a room and what each is bound to', () => {
    store().registerRoom('bedroom', 'photo');
    const spirits = activeHouse(store()).rooms.bedroom!.spirits;
    render(<SpiritReport roomType="bedroom" />);
    const report = screen.getByTestId('spirit-report');
    expect(report.dataset.state).toBe('haunted');
    expect(within(report).getAllByRole('listitem')).toHaveLength(spirits.length);
  });

  it('says the room is at peace once cleared', () => {
    store().registerRoom('bedroom', 'photo');
    store().applyJob('j1', 'bedroom', activeHouse(store()).rooms.bedroom!.spirits);
    render(<SpiritReport roomType="bedroom" />);
    expect(screen.getByTestId('spirit-report').dataset.state).toBe('cleared');
    expect(screen.getByText(/is at peace/)).toBeInTheDocument();
  });

  it('renders nothing for a room that has not been photographed', () => {
    render(<SpiritReport roomType="office" />);
    expect(screen.queryByTestId('spirit-report')).toBeNull();
  });
});

describe('MansionProgress', () => {
  it('starts at 0 of 7 with every room haunted', () => {
    render(<MansionProgress />);
    expect(screen.getByTestId('rooms-cleared')).toHaveTextContent('0 of 7 rooms cleared');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '7');
    expect(screen.queryByTestId('house-built')).toBeNull();
  });

  it('updates as rooms are cleared and marks them in the list', () => {
    store().registerRoom('bedroom', 'p');
    store().applyJob('j', 'bedroom', activeHouse(store()).rooms.bedroom!.spirits);
    render(<MansionProgress />);
    expect(screen.getByTestId('rooms-cleared')).toHaveTextContent('1 of 7 rooms cleared');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '1 of 7 rooms cleared');
    expect(document.querySelector('[data-room="bedroom"]')).toHaveAttribute('data-cleared', 'true');
    expect(document.querySelector('[data-room="kitchen"]')).toHaveAttribute('data-cleared', 'false');
  });

  it('offers to build the next house only when this one is built, and then does', async () => {
    const user = userEvent.setup();
    render(<MansionProgress />);
    expect(screen.queryByRole('button', { name: 'Build the next house' })).toBeNull();

    ROOM_SLOTS.forEach((room, i) => {
      store().registerRoom(room, `r${i}`);
      store().applyJob(`jb${i}`, room, activeHouse(store()).rooms[room]!.spirits);
    });
    // re-render with the new store state
    cleanup();
    render(<MansionProgress />);
    expect(screen.getByTestId('house-built')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Build the next house' }));
    expect(screen.getByTestId('house-name')).toHaveTextContent('House 2');
    expect(screen.getByTestId('rooms-cleared')).toHaveTextContent('0 of 7 rooms cleared');
    expect(screen.getByText('1 built')).toBeInTheDocument();
  });
});

describe('OutcomeBanner', () => {
  const base: JobOutcome = { jobId: 'j', roomType: 'living-room', driven: [], remaining: [], roomCleared: false, houseBuilt: false };

  it('names who was driven out and who still lingers, and what to replace', () => {
    render(<OutcomeBanner outcome={{ ...base, driven: ['seating'], remaining: ['lighting'] }} replacedAny />);
    const banner = screen.getByTestId('outcome-banner');
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveTextContent('A spirit has been driven out');
    expect(banner).toHaveTextContent('The Lady on the Settee');
    expect(banner).toHaveTextContent('The Lamplighter');
    expect(banner).toHaveTextContent('Replace the lamps & lighting');
  });

  it('pluralises, and celebrates a cleared room and a built house', () => {
    render(<OutcomeBanner outcome={{ ...base, driven: ['seating', 'tables'], roomCleared: true, houseBuilt: true }} replacedAny />);
    const banner = screen.getByTestId('outcome-banner');
    expect(banner).toHaveTextContent('2 spirits have been driven out');
    expect(banner).toHaveTextContent('The Living Room is at peace');
    expect(banner).toHaveTextContent('is built');
  });

  it('explains plainly when nothing was replaced', () => {
    render(<OutcomeBanner outcome={{ ...base, remaining: ['seating'] }} replacedAny={false} />);
    expect(screen.getByTestId('outcome-banner')).toHaveTextContent('No furniture was replaced, so the spirits stay');
  });

  it('explains when the replaced furniture held no spirit', () => {
    render(<OutcomeBanner outcome={{ ...base, remaining: ['seating'] }} replacedAny />);
    expect(screen.getByTestId('outcome-banner')).toHaveTextContent('None of those pieces held a spirit');
  });
});

describe('SpiritOverlay', () => {
  it('is decorative and inert', () => {
    render(<SpiritOverlay spirits={[{ key: 'seating', state: 'lingering' }]} />);
    const o = screen.getByTestId('spirit-overlay');
    expect(o.getAttribute('aria-hidden')).toBe('true');
    expect(o.className).toContain('pointer-events-none');
  });

  it('lets leaving spirits play their exit and then removes them, while lingering ones stay', () => {
    vi.useFakeTimers();
    render(
      <SpiritOverlay
        spirits={[
          { key: 'seating', state: 'leaving' },
          { key: 'lighting', state: 'lingering' },
        ]}
      />
    );
    const get = (k: string) => document.querySelector(`[data-furniture="${k}"]`) as HTMLElement;
    expect(get('seating').dataset.state).toBe('leaving');
    expect(get('lighting').dataset.state).toBe('lingering');
    vi.advanceTimersByTime(3000);
    // React state updates from the timer
    return Promise.resolve().then(() => {
      expect(get('seating').dataset.state).toBe('gone');
      expect(get('lighting').dataset.state).toBe('lingering');
    });
  });
});

describe('GlitchText emphasis (the italic crimson headline word)', () => {
  it('emphasises only the requested whole word', () => {
    render(<GlitchText as="h1" text="Your Dream Home Has Secrets." emphasize="Secrets." />);
    const words = document.querySelectorAll('.hf-word');
    const emphasised = Array.from(words).filter((w) => w.classList.contains('hf-emphasis'));
    expect(emphasised).toHaveLength(1);
    expect(emphasised[0].textContent).toBe('Secrets.');
  });

  it('emphasises a run of whole words (the red phrase in the hero paragraph)', () => {
    render(<GlitchText text="still remember their past." emphasize="remember their past." />);
    const emphasised = Array.from(document.querySelectorAll('.hf-word.hf-emphasis')).map((w) => w.textContent);
    expect(emphasised).toEqual(['remember', 'their', 'past.']);
  });

  it('breaks a line where the text has a newline, and reads as one sentence', () => {
    render(<GlitchText as="p" text={'A place of rest...\nbut be warned'} />);
    expect(document.querySelectorAll('br.hf-br')).toHaveLength(1);
    expect(document.querySelector('.sr-only')?.textContent).toBe('A place of rest... but be warned');
    // a space stays where the break is switched off, so the words never run together
    expect(document.querySelector('.hf-glitch__chars')?.textContent).toBe('A place of rest... but be warned');
  });

  it('emphasises nothing by default and keeps the accessible name intact', () => {
    render(<GlitchText as="h1" text="Your Dream Home, Reimagined." />);
    expect(document.querySelector('.hf-emphasis')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Your Dream Home, Reimagined.' })).toBeInTheDocument();
  });

  it('keeps a real space between words (they must not run together)', () => {
    render(<GlitchText text="Design Studio" />);
    expect(document.querySelector('.hf-glitch__chars')?.textContent).toBe('Design Studio');
  });
});
