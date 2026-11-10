/**
 * PolaroidStage
 *
 * The blank polaroid on the Ouija board, brought to life. Whatever is passed as `children` is shown inside the
 * polaroid's window (the upload area, then the visitor's photograph). The polaroid's white strip carries the
 * title and a line of guidance, as if written on it; `below` is for things that belong under the card.
 *
 * Laptop and desktop (`wide`): the stage is fixed exactly over the polaroid in the board backdrop, placed by the same
 * cover maths, so the photograph sits in the picture's own window at any screen size.
 * Tablet and phone: the stage is an ordinary block that shows a cropped piece of the same board picture around
 * the polaroid, so it works in the page's scrolling layout.
 */

import type { CSSProperties, ReactNode } from 'react';
import { BOARD, BOARD_CROP, coverPlacement, cropBackground, place, within, type Rect } from './geometry';
import { useViewportSize } from './useViewportSize';

export type StageState = 'empty' | 'photo' | 'ready' | 'working';

interface PolaroidStageProps {
  wide: boolean;
  state: StageState;
  title: string;
  /** The line written on the polaroid's strip. */
  line: ReactNode;
  children: ReactNode;
  /** Shown under the polaroid. */
  below?: ReactNode;
  /** Keep it mounted (so the file chooser still exists) but out of sight. */
  hidden?: boolean;
}

/** The white strip under the photograph, where the writing goes. */
const STRIP: Rect = { x: 664, y: 618, w: 340, h: 72 };

export function PolaroidStage({ wide, state, title, line, children, below, hidden = false }: PolaroidStageProps) {
  const view = useViewportSize();

  const region: Rect = wide ? BOARD.card : BOARD_CROP;
  const frame: CSSProperties = wide
    ? (() => {
        const card = place(BOARD.card, coverPlacement(view));
        return { left: card.x, top: card.y, width: card.w, height: card.h };
      })()
    : { ...cropBackground(BOARD_CROP), backgroundImage: `url(${BOARD.src})`, backgroundRepeat: 'no-repeat' };

  return (
    <div className="rt-stage-wrap" data-mode={wide ? 'fixed' : 'inline'} hidden={hidden}>
      <div className="rt-stage" data-testid="polaroid-stage" data-state={state} style={frame}>
        <div className="rt-stage__window" style={within(BOARD.window, region)}>
          {children}
        </div>
        <div className="rt-stage__strip" style={within(STRIP, region)}>
          <h2 className="rt-stage__title">{title}</h2>
          <p className="rt-stage__line" data-testid="stage-line">
            {line}
          </p>
        </div>
        {wide && below && <div className="rt-stage__below">{below}</div>}
      </div>
      {!wide && below && <div className="rt-stage__below rt-stage__below--flow">{below}</div>}
    </div>
  );
}
