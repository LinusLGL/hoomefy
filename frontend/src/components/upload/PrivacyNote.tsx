import { ShieldCheck } from 'lucide-react';
import { getProviderMode, isBackupAiEnabled } from '@/features/studio/ai';

/** Says plainly where the photograph goes. */
export function PrivacyNote({ className }: { className?: string }) {
  const live = getProviderMode() === 'live';
  const backup = live && isBackupAiEnabled();
  return (
    <p className={className ?? 'flex items-start gap-2 text-xs text-ivory/70'} data-testid="privacy-note">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <span>
        {live
          ? `Your photo is prepared on this device and location data is removed. When you press Generate, a compressed copy is sent to the free AI service on Hugging Face${backup ? ' or, if that has no free time left, to the same model on Cloudflare Workers AI' : ''}. It is not kept by Hoomefy unless you choose to save a design.`
          : 'Demo mode: your photo never leaves this device.'}
      </span>
    </p>
  );
}
