/**
 * HauntingControls
 *
 * Two discreet, always-reachable controls:
 *  1. "Skip transition" - shown only while the takeover is running (also Esc).
 *  2. An unobtrusive "Experience settings" button that opens a small panel:
 *     Elegant / Haunted, disable or enable horror effects, Replay the Haunting,
 *     and the sound.
 *
 * Before the visitor has seen the reveal, the panel exposes only a neutral
 * "Visual effects" switch so the surprise is not given away. Both controls stay
 * keyboard operable and are the only interactive elements the haunting layer adds.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { SlidersHorizontal, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useHauntingStore } from './hauntingStore';
import { cn } from '@/utils/cn';

export function HauntingControls() {
  const experience = useHauntingStore((s) => s.experience);
  const horrorEnabled = useHauntingStore((s) => s.horrorEnabled);
  const takeoverSeen = useHauntingStore((s) => s.takeoverSeen);
  const sequence = useHauntingStore((s) => s.sequence);
  const audioEnabled = useHauntingStore((s) => s.audioEnabled);
  const candleCursor = useHauntingStore((s) => s.candleCursor);
  const candleDarkness = useHauntingStore((s) => s.candleDarkness);
  const actions = useHauntingStore.getState;

  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const running = sequence === 'running';
  const revealed = takeoverSeen || experience === 'haunted';

  // Escape: skip the sequence while it runs; otherwise close the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (useHauntingStore.getState().sequence === 'running') {
        actions().requestSkip();
      } else if (open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, actions]);

  const soundAvailable = horrorEnabled && (experience === 'haunted' || running);

  return (
    <>
      {running && (
        <button type="button" className="hf-skip" onClick={() => actions().requestSkip()} data-testid="skip-transition">
          <SkipForward className="w-4 h-4" aria-hidden="true" />
          Skip transition
          <span className="hf-skip__hint">Esc</span>
        </button>
      )}

      <div className={cn('hf-controls', !revealed && 'hf-controls--quiet')} data-hf-controls="">
        {soundAvailable && (
          <button
            type="button"
            className="hf-controls__toggle hf-controls__sound"
            aria-label={audioEnabled ? 'Mute sound' : 'Unmute sound'}
            onClick={() => actions().setAudioEnabled(!audioEnabled)}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" aria-hidden="true" /> : <VolumeX className="w-4 h-4" aria-hidden="true" />}
          </button>
        )}
        <button
          ref={buttonRef}
          type="button"
          className="hf-controls__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label="Experience settings"
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
        </button>

        {open && (
          <div id={panelId} role="group" aria-label="Experience settings" className="hf-controls__panel">
            {!revealed ? (
              <label className="hf-controls__row">
                <span>
                  Visual effects
                  <small>Page animations and atmospheric effects</small>
                </span>
                <input
                  type="checkbox"
                  checked={horrorEnabled}
                  onChange={(e) => (e.target.checked ? actions().enableHorror() : actions().disableHorror())}
                />
              </label>
            ) : (
              <>
                <fieldset className="hf-controls__group">
                  <legend>Experience</legend>
                  <button
                    type="button"
                    aria-pressed={experience === 'elegant'}
                    onClick={() => actions().chooseElegant()}
                    className={cn('hf-chip', experience === 'elegant' && 'hf-chip--on')}
                  >
                    Elegant mode
                  </button>
                  <button
                    type="button"
                    aria-pressed={experience === 'haunted'}
                    disabled={!horrorEnabled}
                    onClick={() => actions().chooseHaunted()}
                    className={cn('hf-chip', experience === 'haunted' && 'hf-chip--on')}
                  >
                    Haunted mode
                  </button>
                </fieldset>

                <label className="hf-controls__row">
                  <span>
                    Horror effects
                    <small>{horrorEnabled ? 'Enabled' : 'Disabled: the site stays Elegant'}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={horrorEnabled}
                    onChange={(e) => (e.target.checked ? actions().enableHorror() : actions().disableHorror())}
                  />
                </label>

                <label className="hf-controls__row">
                  <span>
                    Candle cursor
                    <small>Replaces the mouse pointer with a candle</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={candleCursor}
                    onChange={(e) => actions().setCandleCursor(e.target.checked)}
                  />
                </label>

                <label className="hf-controls__row">
                  <span>
                    Candlelight darkness
                    <small>{candleCursor ? 'The room is dark except around your candle' : 'Needs the candle cursor'}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={candleDarkness && candleCursor}
                    disabled={!candleCursor}
                    onChange={(e) => actions().setCandleDarkness(e.target.checked)}
                  />
                </label>

                <button
                  type="button"
                  className="hf-controls__action"
                  onClick={() => {
                    setOpen(false);
                    actions().replay();
                  }}
                >
                  Replay the Haunting
                </button>

                <button
                  type="button"
                  className="hf-controls__action"
                  aria-pressed={audioEnabled}
                  onClick={() => actions().setAudioEnabled(!audioEnabled)}
                >
                  {audioEnabled ? <Volume2 className="w-4 h-4" aria-hidden="true" /> : <VolumeX className="w-4 h-4" aria-hidden="true" />}
                  Sound: {audioEnabled ? 'on' : 'off'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
