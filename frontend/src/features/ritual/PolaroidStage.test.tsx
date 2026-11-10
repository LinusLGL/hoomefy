import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PolaroidStage } from './PolaroidStage';
import { BOARD, coverPlacement, place } from './geometry';

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

const stage = () => screen.getByTestId('polaroid-stage');

beforeEach(() => setViewport(1366, 768));

describe('PolaroidStage on laptop and desktop', () => {
  it('sits exactly over the polaroid drawn on the board', () => {
    render(
      <PolaroidStage wide state="empty" title="The Seance Table" line="Lay a photograph here.">
        <p>window content</p>
      </PolaroidStage>
    );
    const card = place(BOARD.card, coverPlacement({ width: 1366, height: 768 }));
    expect(stage().style.left).toBe(`${card.x}px`);
    expect(stage().style.top).toBe(`${card.y}px`);
    expect(stage().style.width).toBe(`${card.w}px`);
    expect(stage().style.height).toBe(`${card.h}px`);
    expect(stage().closest('.rt-stage-wrap')).toHaveAttribute('data-mode', 'fixed');
  });

  it('follows the screen when it is a different shape', () => {
    setViewport(2560, 1080);
    render(
      <PolaroidStage wide state="empty" title="t" line="l">
        <p>x</p>
      </PolaroidStage>
    );
    const card = place(BOARD.card, coverPlacement({ width: 2560, height: 1080 }));
    expect(parseFloat(stage().style.left)).toBeCloseTo(card.x, 3);
    expect(parseFloat(stage().style.width)).toBeCloseTo(card.w, 3);
  });

  it('shows the content in the window, and the title and the guidance on the strip', () => {
    render(
      <PolaroidStage wide state="ready" title="The Seance Table" line="Touch the photograph to light the five flames.">
        <p>window content</p>
      </PolaroidStage>
    );
    expect(screen.getByText('window content').closest('.rt-stage__window')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The Seance Table' })).toBeInTheDocument();
    expect(screen.getByTestId('stage-line')).toHaveTextContent('Touch the photograph to light the five flames.');
    expect(stage()).toHaveAttribute('data-state', 'ready');
  });

  it('keeps the window inside the card', () => {
    render(
      <PolaroidStage wide state="empty" title="t" line="l">
        <p>x</p>
      </PolaroidStage>
    );
    const win = document.querySelector('.rt-stage__window') as HTMLElement;
    expect(parseFloat(win.style.left)).toBeGreaterThan(0);
    expect(parseFloat(win.style.left) + parseFloat(win.style.width)).toBeLessThan(100);
  });

  it('puts what belongs under the polaroid inside the stage', () => {
    render(
      <PolaroidStage wide state="working" title="t" line="l" below={<p>status plate</p>}>
        <p>x</p>
      </PolaroidStage>
    );
    expect(stage()).toContainElement(screen.getByText('status plate'));
  });

  it('can be hidden while staying in the page, so the file chooser still exists', () => {
    render(
      <PolaroidStage wide state="empty" title="t" line="l" hidden>
        <input type="file" data-testid="chooser" />
      </PolaroidStage>
    );
    expect(screen.getByTestId('chooser')).toBeInTheDocument();
    expect(stage().closest('.rt-stage-wrap')).toHaveAttribute('hidden');
  });
});

describe('PolaroidStage on tablet and phone', () => {
  it('is a block in the page that shows the part of the board around the polaroid', () => {
    setViewport(390, 844);
    render(
      <PolaroidStage wide={false} state="empty" title="t" line="l">
        <p>x</p>
      </PolaroidStage>
    );
    expect(stage().closest('.rt-stage-wrap')).toHaveAttribute('data-mode', 'inline');
    expect(stage().style.backgroundImage).toContain('/images/haunted/ritual/ouija-board.webp');
    expect(stage().style.aspectRatio).not.toBe('');
    expect(stage().style.left).toBe('');
  });

  it('puts what belongs under the polaroid after it, in the flow of the page', () => {
    setViewport(390, 844);
    render(
      <PolaroidStage wide={false} state="working" title="t" line="l" below={<p>status plate</p>}>
        <p>x</p>
      </PolaroidStage>
    );
    const below = screen.getByText('status plate').closest('.rt-stage__below') as HTMLElement;
    expect(below).toHaveClass('rt-stage__below--flow');
    expect(stage()).not.toContainElement(below);
  });
});
