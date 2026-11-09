/**
 * AssistantCard
 *
 * Contextual guidance in the Studio's right-hand panel.
 * Elegant: a "Design Assistant" with a sparkle icon.
 * Haunted: Mori, a faint presence (static; no bobbing, so nothing competes with the UI).
 */

import { Ghost, Sparkles } from 'lucide-react';
import { useIsHaunted } from '@/features/haunting/hauntingStore';
import { getStudioCopy } from './studioCopy';
import { cn } from '@/utils/cn';

interface AssistantCardProps {
  title: string;
  message: string;
  className?: string;
}

export function AssistantCard({ title, message, className }: AssistantCardProps) {
  const haunted = useIsHaunted();
  const copy = getStudioCopy(haunted);
  const Icon = haunted ? Ghost : Sparkles;

  return (
    <section
      aria-label={copy.assistantName}
      className={cn('rounded-xl border border-navy-700 bg-navy-800 p-4', haunted && 'border-amber-600/40', className)}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border',
            haunted ? 'border-accent/40 bg-navy-900 text-accent' : 'border-navy-600 bg-navy-900 text-accent'
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">{copy.assistantName}</p>
          <h4 className="mt-1 text-sm font-semibold text-ivory">{title}</h4>
          <p className="mt-1 text-sm leading-relaxed text-ivory/80">{message}</p>
        </div>
      </div>
    </section>
  );
}
