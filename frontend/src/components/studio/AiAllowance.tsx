/**
 * AiAllowance: explains the free AI allowance and lets a visitor add their own free Hugging Face token
 * for more. The token stays in this tab's session storage and is only sent to Hugging Face.
 */

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getHfToken, getProviderMode, isBackupAiEnabled, isValidHfToken, setHfToken } from '@/features/studio/ai';
import { useToast } from '@/hooks/useToast';

export function AiAllowance() {
  const toast = useToast();
  const [saved, setSaved] = useState<boolean>(() => Boolean(getHfToken()));
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (getProviderMode() !== 'live') return null;

  const save = () => {
    if (!isValidHfToken(value)) {
      setError('That does not look like a Hugging Face token. It starts with hf_.');
      return;
    }
    setHfToken(value);
    setSaved(true);
    setValue('');
    setError(null);
    toast.success('Token saved for this tab', 'You now use your own free Hugging Face allowance.');
  };

  const remove = () => {
    setHfToken(null);
    setSaved(false);
  };

  return (
    <details className="rounded-lg border border-navy-700 bg-navy-900 p-4 text-sm" data-testid="ai-allowance">
      <summary className="flex cursor-pointer items-center gap-2 font-medium text-ivory">
        <KeyRound className="h-4 w-4 text-accent" aria-hidden="true" />
        More free AI time
      </summary>
      <div className="mt-3 space-y-3 text-xs text-ivory/75">
        <p>
          The AI runs on Hugging Face&apos;s free GPUs. You get about 2 minutes a day without an account, enough for many designs. A free Hugging Face account gets about 5 minutes.
        </p>
        {isBackupAiEnabled() && (
          <p data-testid="ai-backup-note">
            When that runs out, signed-in visitors automatically use a backup source: the same model on Cloudflare. Its free allowance is shared by everyone using the site and renews every day at midnight UTC.
          </p>
        )}
        <p>
          Create a free token at{' '}
          <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-4 hover:underline">
            huggingface.co/settings/tokens
          </a>{' '}
          (a read token is enough) and paste it here.
        </p>
        {saved ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-ivory">A token is saved for this tab.</span>
            <Button type="button" size="sm" variant="ghost" onClick={remove}>
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="hf-token" className="sr-only">
              Hugging Face token
            </label>
            <input
              id="hf-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder="hf_…"
              className="w-full rounded-lg border border-navy-600 px-3 py-2 text-sm text-ivory focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
            {error && (
              <p className="text-danger" role="alert">
                {error}
              </p>
            )}
            <Button type="button" size="sm" variant="secondary" onClick={save} disabled={!value.trim()}>
              Use my token
            </Button>
          </div>
        )}
      </div>
    </details>
  );
}
