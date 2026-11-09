/**
 * RoomTypeSelector Component
 * 
 * Grid of room type options for selection.
 */

import { RoomType } from '@/types';
import { cn } from '@/utils/cn';
import {
  Sofa,
  Bed,
  UtensilsCrossed,
  Armchair,
  Monitor,
  Bath,
  Home,
} from 'lucide-react';

interface RoomTypeSelectorProps {
  selected: RoomType | null;
  onSelect: (roomType: RoomType) => void;
  disabled?: boolean;
}

const ROOM_TYPES: Array<{
  type: RoomType;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
  {
    type: 'living-room',
    label: 'Living Room',
    icon: Sofa,
    description: 'Cozy gathering spaces',
  },
  {
    type: 'bedroom',
    label: 'Bedroom',
    icon: Bed,
    description: 'Peaceful sleeping areas',
  },
  {
    type: 'kitchen',
    label: 'Kitchen',
    icon: UtensilsCrossed,
    description: 'Modern cooking spaces',
  },
  {
    type: 'dining-room',
    label: 'Dining Room',
    icon: Armchair,
    description: 'Elegant dining areas',
  },
  {
    type: 'office',
    label: 'Office',
    icon: Monitor,
    description: 'Productive workspaces',
  },
  {
    type: 'bathroom',
    label: 'Bathroom',
    icon: Bath,
    description: 'Spa-like retreats',
  },
  {
    type: 'other',
    label: 'Other',
    icon: Home,
    description: 'Any other space',
  },
];

export function RoomTypeSelector({
  selected,
  onSelect,
  disabled = false,
}: RoomTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-ivory">Room Type</h3>
        <p className="text-sm text-ivory/70 mt-1">
          What kind of room are you redesigning?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ROOM_TYPES.map(({ type, label, icon: Icon, description }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            disabled={disabled}
            className={cn(
              'relative p-2.5 rounded-lg border-2 text-left transition-all',
              'hover:border-amber-500 hover:shadow-md',
              'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
              selected === type
                ? 'border-amber-500 bg-amber-50 shadow-md'
                : 'border-navy-700 bg-navy-900',
              disabled && 'opacity-50 cursor-not-allowed hover:border-navy-700'
            )}
          >
            <div className="flex items-center gap-2 pr-4">
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  selected === type
                    ? 'bg-amber-600 text-on-accent'
                    : 'bg-navy-800 text-ivory/70'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    selected === type ? 'text-accent' : 'text-ivory'
                  )}
                >
                  {label}
                </p>
                <p
                  className={cn(
                    'sr-only',
                    selected === type ? 'text-accent' : 'text-ivory/70'
                  )}
                >
                  {description}
                </p>
              </div>
            </div>

            {/* Selected Indicator */}
            {selected === type && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-on-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
