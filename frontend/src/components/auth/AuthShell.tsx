/**
 * AuthShell
 *
 * Shared full-page layout for the auth screens. Uses a dark card so the
 * Input component's ivory text stays readable.
 *
 * In the Haunted experience every auth screen shares one design with the sign-in gate: the
 * looping video behind the page, the Hoomefy mark and red rule above, and a gilded frame
 * around the card (gold for returning companions, crimson for new souls).
 */

import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { HauntedAuthBrand } from '@/features/haunting/HauntedAuthBrand';
import { HauntedBackdropVideo } from '@/features/haunting/HauntedBackdropVideo';
import { useHauntingStore } from '@/features/haunting/hauntingStore';

interface AuthShellProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Haunted frame colour: gold for a returning companion, crimson for a new soul. */
  tone?: 'companion' | 'soul';
}

export function AuthShell({ icon, title, description, children, tone = 'companion' }: AuthShellProps) {
  const haunted = useHauntingStore((s) => s.horrorEnabled && s.experience === 'haunted');

  const card = (
    <Card
      data-tone={tone}
      className="hf-auth__card relative z-10 w-full max-w-md bg-navy-800 border border-navy-700 space-y-6"
    >
      <CardHeader className="items-center text-center">
        {icon && !haunted && <div className="mb-2">{icon}</div>}
        <CardTitle className="text-ivory">{title}</CardTitle>
        {description && <CardDescription className="text-ivory/70">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  return (
    <div className="hf-auth relative isolate min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-navy-900 via-purple-900 to-navy-900 px-4 py-12">
      <HauntedBackdropVideo />
      {haunted ? (
        <div className="hf-auth__column relative z-10 flex w-full max-w-md flex-col items-center">
          <HauntedAuthBrand />
          {card}
        </div>
      ) : (
        card
      )}
    </div>
  );
}
