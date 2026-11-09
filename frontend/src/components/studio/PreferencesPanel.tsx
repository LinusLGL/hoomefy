/**
 * PreferencesPanel
 *
 * Colour palette, how far the room should change, extra instructions and a furniture budget.
 * Palette, intensity and instructions go into the image prompt; the budget feeds the shopping list.
 */

import type { DesignPreferences } from '@/types';
import { cn } from '@/utils/cn';
import { Palette, Sparkles, MessageSquare, Wallet } from 'lucide-react';
import { MAX_FREE_TEXT } from '@/features/studio/prompt';

interface PreferencesPanelProps {
  preferences: DesignPreferences;
  onChange: (preferences: Partial<DesignPreferences>) => void;
  disabled?: boolean;
}

const COLOR_PALETTES = [
  { value: 'warm', label: 'Warm', colors: ['#D4A574', '#E67E22', '#C0392B'] },
  { value: 'cool', label: 'Cool', colors: ['#3498DB', '#1ABC9C', '#9B59B6'] },
  { value: 'neutral', label: 'Neutral', colors: ['#ECF0F1', '#95A5A6', '#34495E'] },
  { value: 'bold', label: 'Bold', colors: ['#E74C3C', '#F39C12', '#8E44AD'] },
] as const;

export function PreferencesPanel({ preferences, onChange, disabled = false }: PreferencesPanelProps) {
  const intensity = preferences.intensity ?? 0.7;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-ivory">Preferences</h3>
        <p className="mt-1 text-sm text-ivory/70">Fine-tune the transformation</p>
      </div>

      {/* Color Palette */}
      <fieldset className="space-y-3">
        <legend className="flex items-center gap-2 text-sm font-medium text-ivory">
          <Palette className="h-4 w-4 text-ivory/70" aria-hidden="true" />
          Colour palette
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_PALETTES.map(({ value, label, colors }) => {
            const on = preferences.colorPalette === value;
            return (
              <button
                key={value}
                type="button"
                // Pressing the chosen palette again clears it, so the style's own colours are used.
                onClick={() => onChange({ colorPalette: on ? undefined : value })}
                disabled={disabled}
                aria-pressed={on}
                className={cn(
                  'rounded-lg border-2 p-3 text-left transition-all hover:border-amber-500',
                  'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
                  on ? 'border-amber-500 bg-amber-500/10' : 'border-navy-700 bg-navy-900',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                <span className="mb-2 flex items-center gap-1.5" aria-hidden="true">
                  {colors.map((color) => (
                    <span key={color} className="h-5 w-5 rounded-full border border-navy-700" style={{ backgroundColor: color }} />
                  ))}
                </span>
                <span className={cn('text-xs font-medium', on ? 'text-accent' : 'text-ivory')}>{label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Transformation Intensity */}
      <div className="space-y-3">
        <label htmlFor="intensity" className="flex items-center gap-2 text-sm font-medium text-ivory">
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
        <div className="flex justify-between text-xs text-ivory/70">
          <span>Subtle</span>
          <span className="font-medium text-accent">{Math.round(intensity * 100)}%</span>
          <span>Bold</span>
        </div>
      </div>

      {/* Custom instructions */}
      <div className="space-y-2">
        <label htmlFor="custom-instructions" className="flex items-center gap-2 text-sm font-medium text-ivory">
          <MessageSquare className="h-4 w-4 text-ivory/70" aria-hidden="true" />
          Extra instructions <span className="font-normal text-ivory/70">(optional)</span>
        </label>
        <textarea
          id="custom-instructions"
          value={preferences.customInstructions ?? ''}
          onChange={(e) => onChange({ customInstructions: e.target.value })}
          disabled={disabled}
          placeholder="e.g. add more natural light, include plants, keep the fireplace"
          maxLength={MAX_FREE_TEXT}
          rows={3}
          className={cn(
            'w-full resize-none rounded-lg border border-navy-600 px-4 py-3 text-sm text-ivory placeholder-navy-400',
            'transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        />
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <label htmlFor="budget" className="flex items-center gap-2 text-sm font-medium text-ivory">
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
            'w-full rounded-lg border border-navy-600 px-4 py-3 text-sm text-ivory placeholder-navy-400',
            'transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        />
      </div>
    </div>
  );
}
