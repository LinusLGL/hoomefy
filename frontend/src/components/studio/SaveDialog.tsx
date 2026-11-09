/**
 * SaveDialog: saves the design on the canvas to the visitor's account.
 * Nothing is stored until the visitor names the design and ticks the consent box.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { useStudioStore } from '@/stores/studioStore';
import { useShoppingStore } from '@/features/furniture/shoppingStore';
import { useToast } from '@/hooks/useToast';
import { designsService, NAME_MAX } from '@/services/designsService';
import { STYLES } from '@/features/studio/styles';
import { ROOM_TYPES } from '@/types';
import { ROUTES } from '@/utils/constants';

interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SaveDialog({ open, onClose, onSaved }: SaveDialogProps) {
  const toast = useToast();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const image = useStudioStore((s) => s.uploadedImage);
  const version = useStudioStore((s) => s.history.find((v) => v.id === s.activeVersionId) ?? null);
  const roomType = useStudioStore((s) => s.roomType);
  const preferences = useStudioStore((s) => s.preferences);
  const items = useShoppingStore((s) => s.items);

  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAgreed(false);
    setError(null);
    if (version) {
      const room = roomType ? ROOM_TYPES[roomType].name : 'Room';
      setName(`${room}, ${STYLES[version.style].name}`.slice(0, NAME_MAX));
    }
  }, [open, version, roomType]);

  const persistent = designsService.persistent;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version || !image?.inference) return;
    setSaving(true);
    setError(null);
    try {
      await designsService.save({
        name,
        roomType,
        style: version.style,
        prompt: version.prompt,
        preferences,
        shopping: items,
        original: image.inference,
        generated: version.blob,
      });
      toast.success('Design saved', persistent ? 'Find it under My Designs.' : 'It is kept for this visit only because no account storage is connected.');
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not save your design.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-labelledby="save-title" data-testid="save-dialog">
        <DialogHeader onClose={onClose}>
          <DialogTitle id="save-title" className="text-xl">
            Save this design
          </DialogTitle>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="space-y-4 text-sm text-ivory/85">
            <p>Create a free account, or sign in, to keep this design and open it again later.</p>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Not now
              </Button>
              <Link to={ROUTES.signIn} state={{ from: location, returning: true }} onClick={onClose}>
                <Button type="button">Sign in</Button>
              </Link>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="design-name" className="text-sm font-medium text-ivory">
                Name
              </label>
              <input
                id="design-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX}
                required
                autoFocus
                className="w-full rounded-lg border border-navy-600 px-4 py-3 text-sm text-ivory focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-ivory/85">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 accent-amber-600"
                data-testid="save-consent"
              />
              <span>
                Save my room photo (compressed, without location data), this design, my settings and my shopping list to my account. I can delete them any time from My Designs.
              </span>
            </label>

            {!persistent && <p className="text-xs text-ivory/60">No account storage is connected on this copy of the site, so the design is kept for this visit only.</p>}
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={saving} disabled={!agreed || !name.trim() || !version}>
                {saving ? 'Saving…' : 'Save design'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
