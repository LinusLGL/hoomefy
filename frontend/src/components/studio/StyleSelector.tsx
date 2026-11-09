/**
 * StyleSelector
 *
 * The five themes as visual cards, plus a "Custom" card that opens a text box for the visitor's own
 * description. The chosen theme (or the custom text) becomes part of the image-edit prompt.
 */

import { Check } from 'lucide-react';
import type { DesignStyle } from '@/types';
import { cn } from '@/utils/cn';
import { STYLES, STYLE_ORDER } from '@/features/studio/styles';
import { MAX_FREE_TEXT } from '@/features/studio/prompt';

interface StyleSelectorProps {
  selected: DesignStyle | null;
  onSelect: (style: DesignStyle) => void;
  customStyle?: string;
  onCustomStyleChange?: (text: string) => void;
  disabled?: boolean;
}

export const CUSTOM_STYLE_PLACEHOLDER =
  'Transform my bedroom into a modern Japanese-inspired interior with warm oak furniture, soft indirect lighting, a low platform bed, and neutral colours.';

export function StyleSelector({ selected, onSelect, customStyle = '', onCustomStyleChange, disabled = false }: StyleSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-ivory">Design Style</h3>
        <p className="mt-1 text-sm text-ivory/70">Pick a theme, or describe your own.</p>
      </div>

      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Design style">
        {STYLE_ORDER.map((id) => {
          const style = STYLES[id];
          const isSelected = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              disabled={disabled}
              aria-pressed={isSelected}
              data-style={id}
              className={cn(
                'hf-frame group relative overflow-hidden rounded-lg border-2 text-left transition-all',
                'hover:border-amber-500 hover:shadow-lg',
                'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
                isSelected ? 'border-amber-500 shadow-lg' : 'border-navy-700',
                disabled && 'cursor-not-allowed opacity-50 hover:border-navy-700'
              )}
            >
              <span aria-hidden="true" className="relative block h-16 w-full overflow-hidden">
                <span className="absolute inset-0 transition-transform group-hover:scale-110" style={{ background: style.gradient }} />
                <span className="absolute bottom-2 left-2 flex gap-1">
                  {style.swatches.map((color) => (
                    <span key={color} className="h-3.5 w-3.5 rounded-full border border-white/60" style={{ backgroundColor: color }} />
                  ))}
                </span>
                {isSelected && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-on-accent shadow-lg">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </span>
              <span className="block space-y-0.5 bg-navy-900 p-3">
                <span className={cn('block text-sm font-semibold', isSelected ? 'text-accent' : 'text-ivory')}>{style.name}</span>
                <span className="block text-xs text-ivory/70">{style.tagline}</span>
              </span>
            </button>
          );
        })}
      </div>

      {selected === 'custom' && (
        <div className="space-y-2">
          <label htmlFor="custom-style" className="text-sm font-medium text-ivory">
            Describe your style
          </label>
          <textarea
            id="custom-style"
            value={customStyle}
            onChange={(e) => onCustomStyleChange?.(e.target.value)}
            disabled={disabled}
            maxLength={MAX_FREE_TEXT}
            rows={5}
            placeholder={CUSTOM_STYLE_PLACEHOLDER}
            aria-describedby="custom-style-count"
            className={cn(
              'w-full resize-none rounded-lg border border-navy-600 px-4 py-3 text-sm text-ivory placeholder-navy-400',
              'transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          />
          <p id="custom-style-count" className="text-xs text-ivory/75">
            {customStyle.length}/{MAX_FREE_TEXT} characters. The model follows your words, so mention furniture, materials, colours and light.
          </p>
        </div>
      )}
    </div>
  );
}
