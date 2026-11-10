/**
 * PreferencesPanel
 *
 * The visitor's own words, how far the room should change, and a furniture budget. It sits in the left-hand
 * controls, under the style, because the words are part of the instruction: they are sent to the image model
 * ahead of the style (see features/studio/prompt.ts), so what is written here changes the picture.
 * The intensity goes into the same prompt; the budget feeds the shopping list.
 */

import type { DesignPreferences } from '@/types';
import { cn } from '@/utils/cn';
import { Sparkles, MessageSquare, Wallet } from 'lucide-react';
import { MAX_FREE_TEXT } from '@/features/studio/prompt';
import { useIsHaunted } from '@/features/haunting/hauntingStore';
import { WHISPERS, WHISPER_INTRO, WHISPER_LABEL, WHISPER_PLACEHOLDER } from '@/features/ritual/copy';
import { appendPhrase } from '@/features/ritual/whisper';

interface PreferencesPanelProps {
  preferences: DesignPreferences;
  onChange: (preferences: Partial<DesignPreferences>) => void;
  disabled?: boolean;
}

export function PreferencesPanel({ preferences, onChange, disabled = false }: PreferencesPanelProps) {
  const intensity = preferences.intensity ?? 0.7;
  const haunted = useIsHaunted();

  return (
    <div className="space-y-5 lg:space-y-2">
      <div>
        <h3 className="text-lg font-semibold text-ivory lg:text-sm">Preferences</h3>
        <p className="mt-1 text-sm text-ivory/70 lg:sr-only">Tell us what to change</p>
      </div>

      {/* Custom instructions: the visitor's own words. */}
      <div className="space-y-2 lg:space-y-1">
        <label htmlFor="custom-instructions" className="flex items-center gap-2 text-sm font-medium text-ivory lg:text-xs">
          <MessageSquare className="h-4 w-4 text-ivory/70" aria-hidden="true" />
          {haunted ? WHISPER_LABEL : 'Extra instructions'} <span className="font-normal text-ivory/70">(optional)</span>
        </label>
        {haunted && (
          <details className="group text-xs text-ivory/80" data-testid="whisper-guide">
            <summary className="cursor-pointer select-none text-accent hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
              How to whisper to the spirits
            </summary>
            <p className="mt-1.5 leading-snug">{WHISPER_INTRO}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Whispers to try">
              {WHISPERS.map((phrase) => (
                <li key={phrase}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ customInstructions: appendPhrase(preferences.customInstructions ?? '', phrase) })}
                    className="rounded-full border border-amber-600/60 px-2.5 py-1 text-left text-xs italic text-ivory/90 transition-colors hover:border-amber-500 hover:bg-amber-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {phrase}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
        <textarea
          id="custom-instructions"
          value={preferences.customInstructions ?? ''}
          onChange={(e) => onChange({ customInstructions: e.target.value })}
          disabled={disabled}
          placeholder={haunted ? WHISPER_PLACEHOLDER : 'e.g. add more natural light, include plants, keep the fireplace'}
          maxLength={MAX_FREE_TEXT}
          rows={3}
          aria-describedby="custom-instructions-help"
          className={cn(
            'w-full resize-none rounded-lg border border-navy-600 px-4 py-3 text-sm text-ivory placeholder-navy-400 lg:h-[4.5rem] lg:px-3 lg:py-1.5 lg:text-xs',
            'transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        />
        <p id="custom-instructions-help" className="text-xs text-ivory/60 lg:text-[11px] lg:leading-tight">
          Your words come first. The style fills in the rest.
        </p>
      </div>

      {/* Transformation Intensity */}
      <div className="space-y-3 lg:space-y-1">
        <label htmlFor="intensity" className="flex items-center gap-2 text-sm font-medium text-ivory lg:text-xs">
          <Sparkles className="h-4 w-4 text-ivory/70" aria-hidden="true" />
          Transformation intensity
        </label>
        <input
          id="intensity"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={intensity}
          onChange={(e) => onChange({ intensity: parseFloat(e.target.value) })}
          disabled={disabled}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-navy-700 accent-amber-600"
        />
        <div className="flex justify-between text-xs text-ivory/70 lg:-mt-0.5">
          <span>Subtle</span>
          <span className="font-medium text-accent">{Math.round(intensity * 100)}%</span>
          <span>Bold</span>
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-2 lg:space-y-1">
        <label htmlFor="budget" className="flex items-center gap-2 text-sm font-medium text-ivory lg:text-xs">
          <Wallet className="h-4 w-4 text-ivory/70" aria-hidden="true" />
          Furniture budget (USD) <span className="font-normal text-ivory/70">(optional)</span>
        </label>
        <input
          id="budget"
          type="number"
          inputMode="numeric"
          min={0}
          max={1_000_000}
          step={50}
          value={preferences.budget ?? ''}
          onChange={(e) => {
            const n = e.target.value === '' ? undefined : Math.max(0, Math.min(1_000_000, Number(e.target.value)));
            onChange({ budget: Number.isFinite(n as number) ? n : undefined });
          }}
          disabled={disabled}
          placeholder="e.g. 3000"
          className={cn(
            'w-full rounded-lg border border-navy-600 px-4 py-3 text-sm text-ivory placeholder-navy-400 lg:px-3 lg:py-1.5 lg:text-xs',
            'transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        />
      </div>
    </div>
  );
}
