/**
 * CandleRitual
 *
 * The Gothic Moonlit Ritual Chamber: a full-screen dialog with five unlit candles standing in a circle. The
 * visitor lights them in any order. Each one that catches:
 *   - fades its flame in over the unlit picture (each candle is a patch of added light, so the lit and unlit
 *     states line up to the pixel) and then flickers,
 *   - plays its spoken line (script1..5.mp3, unless sound is muted), and
 *   - shows the line in a box in the middle of the circle.
 * Which line is spoken depends on how many candles are lit, not on which one was touched.
 *
 * Lighting the fifth calls onComplete (the studio starts the design then), lets the last line finish, and fades
 * away by itself, calling onClose. Leaving earlier (Escape or the close button) calls onClose without onComplete.
 *
 * Accessible: a labelled modal dialog, real buttons for the candles (Tab, Enter and Space work), the words are
 * announced as they appear, and every animation stops under reduced motion.
 */

import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useHauntingStore } from '@/features/haunting/hauntingStore';
import { CANDLES, CANDLE_SOUNDS, CHAMBER, chamberPlacement, place, type CandleSpec } from './geometry';
import { CANDLE_COUNT, RITUAL_INTRO, freshRitual, isComplete, isLit, lightCandle, messageFor, soundFor, type RitualState } from './ritualState';
import { createScriptPlayer, type ScriptPlayer } from './scriptAudio';
import { useViewportSize } from './useViewportSize';

export interface CandleRitualProps {
  open: boolean;
  /** The fifth candle has just been lit. Called once per ritual. */
  onComplete: () => void;
  /** The ritual is over: it was left early, or it finished and faded. */
  onClose: () => void;
}

/** How long the last line is given when it is not spoken, and the longest it is waited for when it is. */
export const FINALE_SILENT_MS = 3800;
export const FINALE_MAX_MS = 12_000;
/** Pause after the last recording ends, and the length of the fade out. */
const AFTER_VOICE_MS = 1200;
const FADE_MS = 800;
/** Narrower than this, the message goes under the picture instead of over the middle of it. */
const STACK_BELOW = 720;

/**
 * Drawn on <body>, outside the app layer, so its z-index is compared with the ghosts and the dark room (which also
 * live outside it) and not trapped below them.
 */
export function CandleRitual({ open, onComplete, onClose }: CandleRitualProps) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(<RitualScene onComplete={onComplete} onClose={onClose} />, document.body);
}

const SHOUT = /^[A-Z]{3,}[!.,]?$/;

/** The words fade in one after another. The whole sentence is in the page from the start, so a screen reader reads it at once. */
function Words({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${i}-${word}`}>
          <span className={SHOUT.test(word) ? 'rt-word rt-word--shout' : 'rt-word'} style={{ '--i': i } as CSSProperties}>
            {word}
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </>
  );
}

function RitualScene({ onComplete, onClose }: Omit<CandleRitualProps, 'open'>) {
  const audioEnabled = useHauntingStore((s) => s.audioEnabled);
  const view = useViewportSize();
  const placement = useMemo(() => chamberPlacement(view), [view]);
  const s = placement.scale;

  const [ritual, setRitual] = useState<RitualState>(freshRitual);
  const [loaded, setLoaded] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [heard, setHeard] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const player = useRef<ScriptPlayer | null>(null);
  const done = useRef(false);
  // The parent re-renders while a design is being made; timers must not restart each time.
  const completeRef = useRef(onComplete);
  const closeRef = useRef(onClose);
  completeRef.current = onComplete;
  closeRef.current = onClose;

  const lit = ritual.lit.length;
  const complete = isComplete(ritual);
  const message = messageFor(ritual);
  const stacked = view.width < STACK_BELOW;

  // Voices: fetch them as the room opens, stop them when it closes.
  useEffect(() => {
    const p = createScriptPlayer(CANDLE_SOUNDS);
    player.current = p;
    if (audioEnabled) p.preload();
    return () => {
      p.stop();
      player.current = null;
    };
    // Muting later only stops new voices from starting; it does not need the player rebuilt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The picture may already be cached by the time the handler is attached.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  // Focus goes into the dialog and comes back to where it was.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    rootRef.current?.querySelector<HTMLElement>('button.rt-candle')?.focus();
    return () => before?.focus?.();
  }, []);

  // Keep the page behind from scrolling.
  useEffect(() => {
    const previous = document.documentElement.dataset.ritual;
    document.documentElement.dataset.ritual = 'open';
    return () => {
      if (previous === undefined) delete document.documentElement.dataset.ritual;
      else document.documentElement.dataset.ritual = previous;
    };
  }, []);

  const leave = () => {
    if (finishing) setLeaving(true);
    else closeRef.current();
  };

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (finishing) setLeaving(true);
      else closeRef.current();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [finishing]);

  // After the fifth flame: wait for the voice to end (or a fixed time when it is silent or does not end), then fade away.
  useEffect(() => {
    if (!finishing) return undefined;
    const wait = audioEnabled ? (heard ? AFTER_VOICE_MS : FINALE_MAX_MS) : FINALE_SILENT_MS;
    const id = window.setTimeout(() => setLeaving(true), wait);
    return () => window.clearTimeout(id);
  }, [finishing, heard, audioEnabled]);

  useEffect(() => {
    if (!leaving) return undefined;
    const id = window.setTimeout(() => closeRef.current(), FADE_MS);
    return () => window.clearTimeout(id);
  }, [leaving]);

  const light = (candle: CandleSpec) => {
    if (isLit(ritual, candle.id) || isComplete(ritual) || done.current) return;
    const next = lightCandle(ritual, candle.id);
    setRitual(next);
    const sound = soundFor(next);
    const last = isComplete(next);
    if (audioEnabled && sound) player.current?.play(sound, last ? () => setHeard(true) : undefined);
    if (last) {
      done.current = true;
      setFinishing(true);
      completeRef.current();
    }
  };

  // Tab stays inside the dialog.
  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const items = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const centre = place({ x: CHAMBER.centre.x, y: CHAMBER.centre.y, w: 0, h: 0 }, placement);
  const messageStyle: CSSProperties = stacked
    ? { top: Math.min(placement.top + placement.height + 14, Math.max(16, view.height - 190)) }
    : { top: centre.y };

  return (
    <div
      ref={rootRef}
      className="rt-ritual"
      role="dialog"
      aria-modal="true"
      aria-label="The ritual of the five flames"
      data-testid="candle-ritual"
      data-lit={lit}
      data-complete={complete ? 'true' : 'false'}
      data-ready={loaded ? 'true' : 'false'}
      data-leaving={leaving ? 'true' : 'false'}
      onKeyDown={trapTab}
    >
      <div
        className="rt-chamber"
        data-letterbox={placement.height < view.height - 2 || placement.width < view.width - 2 ? 'true' : 'false'}
        style={{ left: placement.left, top: placement.top, width: placement.width, height: placement.height }}
      >
        <img ref={imgRef} className="rt-chamber__img" src={CHAMBER.src} alt="" draggable={false} onLoad={() => setLoaded(true)} />
        <span className="rt-mist rt-mist--a" />
        <span className="rt-mist rt-mist--b" />
      </div>

      {CANDLES.map((candle) => {
        const on = isLit(ritual, candle.id);
        const p = place(candle.patch, placement);
        const wick = place({ x: candle.cx, y: candle.end, w: 0, h: 0 }, placement);
        const flame = place({ x: candle.cx, y: (candle.tip + candle.end) / 2, w: 0, h: 0 }, placement);
        return (
          <div key={candle.id} className="rt-lightwell" aria-hidden="true">
            {/* The light this candle adds, laid over the unlit room. The box flickers; the picture inside ignites. */}
            <div
              className="rt-flamebox"
              data-lit={on ? 'true' : 'false'}
              data-candle={candle.id}
              style={
                {
                  left: p.x,
                  top: p.y,
                  width: p.w,
                  height: p.h,
                  transformOrigin: `${wick.x - p.x}px ${wick.y - p.y}px`,
                  '--rt-dur': `${2.3 + candle.n * 0.37}s`,
                  '--rt-delay': `${-candle.n * 0.61}s`,
                } as CSSProperties
              }
            >
              <img src={candle.patch.src} alt="" draggable={false} />
            </div>
            {on && (
              <>
                <span className="rt-bloom" style={{ left: flame.x, top: flame.y, width: 340 * s, height: 340 * s }} />
                {[0, 1, 2].map((k) => (
                  <span
                    key={k}
                    className="rt-spark"
                    style={{ left: flame.x + (k - 1) * 7 * s, top: flame.y - 16 * s, '--rt-rise': `${(60 + k * 26) * s}px`, '--rt-sway': `${(k - 1) * 14 * s}px`, '--rt-delay': `${k * 0.9}s` } as CSSProperties}
                  />
                ))}
              </>
            )}
          </div>
        );
      })}

      {/* The things to touch. Their size never drops below a comfortable tap target. */}
      {CANDLES.map((candle) => {
        const on = isLit(ritual, candle.id);
        const w = Math.max(48, 92 * s);
        const h = Math.max(48, 140 * s);
        const top = place({ x: 0, y: candle.tip - 14, w: 0, h: 0 }, placement).y;
        const cx = place({ x: candle.cx, y: 0, w: 0, h: 0 }, placement).x;
        return (
          <button
            key={candle.id}
            type="button"
            className="rt-candle"
            data-candle={candle.id}
            data-lit={on ? 'true' : 'false'}
            aria-label={on ? `The ${candle.label} candle is lit` : `Light the ${candle.label} candle`}
            aria-disabled={on || undefined}
            onClick={() => light(candle)}
            style={{ left: cx - w / 2, top, width: w, height: h }}
          >
            <span className="rt-candle__aura" aria-hidden="true" />
          </button>
        );
      })}

      <div className="rt-message-wrap" style={messageStyle} data-stacked={stacked ? 'true' : 'false'}>
        <div className="rt-message" data-final={complete ? 'true' : 'false'} data-intro={message ? 'false' : 'true'} role="status" aria-live="polite" aria-atomic="true" data-testid="ritual-message">
          <p className="rt-message__text" key={lit}>
            <Words text={message ?? RITUAL_INTRO} />
          </p>
        </div>
      </div>

      <p className="rt-count" aria-label={`${lit} of ${CANDLE_COUNT} flames lit`} data-testid="ritual-count">
        {CANDLES.map((candle, i) => (
          <span key={candle.id} className="rt-count__dot" data-on={i < lit ? 'true' : 'false'} aria-hidden="true" />
        ))}
        <span className="rt-count__text">
          {lit} of {CANDLE_COUNT} flames
        </span>
      </p>

      <button type="button" className="rt-close" onClick={leave} aria-label={finishing ? 'Close' : 'Leave the circle'}>
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      <span className="rt-flash" aria-hidden="true" />
    </div>
  );
}
