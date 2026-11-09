import { Home } from 'lucide-react';
import { GhostHouseIcon } from '@/components/icons/GhostHouseIcon';
import { useIsHaunted } from '@/features/haunting/hauntingStore';
import { cn } from '@/utils/cn';

interface BrandMarkProps {
  className?: string;
  iconClassName?: string;
  /** Show only the icon. */
  iconOnly?: boolean;
  textClassName?: string;
}

/**
 * Hoomefy wordmark. Elegant: a house. Haunted: a house that is also a ghost.
 * (No ghost cue is ever shown in the Elegant experience.)
 */
export function BrandMark({ className, iconClassName = 'w-8 h-8', iconOnly = false, textClassName }: BrandMarkProps) {
  const haunted = useIsHaunted();
  const Icon = haunted ? GhostHouseIcon : Home;
  return (
    <span className={cn('hf-brand inline-flex items-center gap-2', className)}>
      <Icon className={cn('hf-brand__icon', iconClassName, haunted && 'hf-ghost-icon')} aria-hidden="true" />
      {!iconOnly && (
        <span className={cn('hf-brand__text text-2xl font-bold font-heading', haunted && 'hf-ghost-logo', textClassName)}>Hoomefy</span>
      )}
    </span>
  );
}
