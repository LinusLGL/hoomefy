/**
 * FurniturePicker
 *
 * Multi-select of the furniture categories to replace. Available in both experiences
 * (it is a real design input: the choice is added to the generation request). In the
 * Haunted experience, categories a spirit is still bound to carry a ghost marker, so the
 * user can see what to replace to drive it out.
 */

import { Ghost } from 'lucide-react';
import type { FurnitureKey, RoomType } from '@/types';
import { cn } from '@/utils/cn';
import { FURNITURE, ROOM_FURNITURE } from './spirits';

interface FurniturePickerProps {
  title: string;
  hint: string;
  roomType: RoomType | null;
  selected: readonly FurnitureKey[];
  onChange: (next: FurnitureKey[]) => void;
  /** Haunted only: categories that still have a spirit bound to them. */
  boundSpirits?: readonly FurnitureKey[];
  disabled?: boolean;
}

export function FurniturePicker({ title, hint, roomType, selected, onChange, boundSpirits = [], disabled = false }: FurniturePickerProps) {
  const options = roomType ? FURNITURE.filter((f) => ROOM_FURNITURE[roomType].includes(f.key)) : FURNITURE;
  const bound = new Set(boundSpirits);

  const toggle = (key: FurnitureKey) => {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  };

  return (
    <fieldset className="space-y-3 lg:space-y-1.5" data-testid="furniture-picker" disabled={disabled}>
      <legend className="text-lg font-semibold text-ivory lg:text-sm">{title}</legend>
      <p className="text-sm text-ivory/75 lg:sr-only">{hint}</p>
      <div className="flex flex-wrap gap-2 lg:gap-1.5">
        {options.map((f) => {
          const on = selected.includes(f.key);
          const haunted = bound.has(f.key);
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              data-furniture={f.key}
              data-bound={haunted ? 'true' : undefined}
              onClick={() => toggle(f.key)}
              className={cn(
                'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors lg:min-h-[24px] lg:gap-1.5 lg:px-2.5 lg:py-0 lg:text-xs',
                'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-navy-900',
                on ? 'border-amber-600 bg-amber-600 text-on-accent' : 'border-navy-600 bg-navy-900 text-ivory hover:border-amber-600',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {haunted && <Ghost className="h-4 w-4 lg:h-3 lg:w-3" aria-hidden="true" />}
              {f.label}
              {haunted && <span className="sr-only"> (a spirit is bound to this)</span>}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && <p className="text-xs text-ivory/70">{selected.length} selected</p>}
    </fieldset>
  );
}
