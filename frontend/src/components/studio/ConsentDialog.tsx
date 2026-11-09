/**
 * ConsentDialog: shown before a photograph is sent to the AI service for the first time.
 * It says exactly what is sent, where, and what Hoomefy keeps.
 */

import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConsentDialogProps {
  open: boolean;
  onAccept: () => void;
  onDemo: () => void;
  onCancel: () => void;
}

export function ConsentDialog({ open, onAccept, onDemo, onCancel }: ConsentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent aria-labelledby="consent-title" aria-describedby="consent-body" data-testid="consent-dialog">
        <DialogHeader onClose={onCancel}>
          <DialogTitle id="consent-title" className="flex items-center gap-3 text-xl">
            <ShieldCheck className="h-6 w-6 text-accent" aria-hidden="true" />
            Send your photo to the AI service?
          </DialogTitle>
        </DialogHeader>
        <div id="consent-body" className="space-y-3 text-sm text-ivory/85">
          <p>
            To redesign your room, a compressed copy of your photo is sent to a free AI model (FLUX.2 klein by Black Forest Labs) running on Hugging Face&apos;s servers.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Location and camera details are removed first.</li>
            <li>Hoomefy does not store your photo. It is only saved to your account if you press Save design and agree.</li>
            <li>Hugging Face handles the photo under its own privacy policy.</li>
          </ul>
          <p>
            <a href="https://huggingface.co/privacy" target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-4 hover:underline">
              Hugging Face privacy policy
            </a>
          </p>
        </div>
        <DialogDescription className="sr-only">Choose whether to send your photo to the AI service.</DialogDescription>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onDemo}>
            Use a demo rendering instead
          </Button>
          <Button type="button" onClick={onAccept} data-testid="consent-accept">
            Send and generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
