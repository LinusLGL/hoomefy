/**
 * Gallery: the user's saved designs.
 * Elegant: a clean grid of framed prints. Haunted: dark framed photographs in an
 * abandoned archive (styling comes from the `hf-frame` class and the theme tokens).
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, FolderOpen, Trash2 } from 'lucide-react';
import { designsService, type SavedDesign } from '@/services/designsService';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ROUTES } from '@/utils/constants';
import { STYLES } from '@/features/studio/styles';
import { openDesignInStudio } from '@/features/studio/openDesign';
import { useToast } from '@/hooks/useToast';
import { useIsHaunted } from '@/features/haunting/hauntingStore';

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; designs: SavedDesign[] };

export default function GalleryPage() {
  const haunted = useIsHaunted();
  const navigate = useNavigate();
  const toast = useToast();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    designsService
      .list()
      .then((designs) => {
        if (!cancelled) setState({ status: 'ready', designs });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : 'We could not load your designs.' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  const open = async (design: SavedDesign) => {
    setBusyId(design.id);
    try {
      await openDesignInStudio(design);
      navigate(ROUTES.studio);
    } catch {
      toast.error('We could not open this design', 'Please try again in a moment.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (design: SavedDesign) => {
    setBusyId(design.id);
    try {
      await designsService.remove(design);
      setState((s) => (s.status === 'ready' ? { status: 'ready', designs: s.designs.filter((d) => d.id !== design.id) } : s));
      toast.success('Design deleted', 'Its photo and result were removed from your account.');
    } catch (err) {
      toast.error('We could not delete this design', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyId(null);
      setConfirming(null);
    }
  };

  return (
    <div className="mx-auto min-h-[70vh] max-w-7xl px-6 py-16 lg:px-8">
      <h1 className="font-heading text-4xl font-bold text-ivory md:text-5xl">{haunted ? 'The Archive' : 'My Designs'}</h1>
      <p className="mt-3 max-w-2xl text-lg text-ivory/75">
        {haunted
          ? 'Every room you have shown us is kept here. None of them have left.'
          : 'Every design you have saved, ready to revisit or refine.'}
      </p>
      {!designsService.persistent && (
        <p className="mt-3 max-w-2xl text-sm text-ivory/60">No account storage is connected on this copy of the site, so designs are kept for this visit only.</p>
      )}

      {state.status === 'loading' && (
        <div className="mt-16 flex justify-center" role="status" aria-live="polite">
          <Spinner size="lg" />
          <span className="sr-only">Loading your designs</span>
        </div>
      )}

      {state.status === 'error' && (
        <div className="mt-12 space-y-3" role="alert">
          <p className="text-danger">{state.message}</p>
          <Button type="button" size="sm" variant="secondary" onClick={load}>
            Try again
          </Button>
        </div>
      )}

      {state.status === 'ready' && state.designs.length === 0 && (
        <div className="mt-16 rounded-xl border border-navy-700 bg-navy-800 p-10 text-center">
          <p className="text-xl text-ivory">{haunted ? 'The archive is empty. For now.' : 'No designs yet.'}</p>
          <Link to={ROUTES.studio} className="mt-6 inline-block font-semibold text-accent hover:text-accent-hover">
            {haunted ? 'Show us a room' : 'Create your first design'}
          </Link>
        </div>
      )}

      {state.status === 'ready' && state.designs.length > 0 && (
        <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {state.designs.map((d) => (
            <li key={d.id} className="hf-frame overflow-hidden rounded-lg border border-navy-700 bg-navy-800" data-testid="saved-design">
              <div className="grid aspect-[4/3] w-full grid-cols-2 overflow-hidden bg-navy-700">
                {[
                  { src: d.originalUrl, alt: `${d.name}: original photo` },
                  { src: d.generatedUrl, alt: `${d.name}: ${STYLES[d.style].name} redesign` },
                ].map((img) => (
                  <div key={img.alt} className="relative overflow-hidden">
                    {img.src && (
                      <img
                        src={img.src}
                        alt={img.alt}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.visibility = 'hidden';
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-3 p-5">
                <div>
                  <h2 className="font-heading text-xl font-semibold text-ivory">{d.name}</h2>
                  <p className="mt-1 text-sm text-ivory/70">
                    {STYLES[d.style].name} · {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" onClick={() => void open(d)} isLoading={busyId === d.id && confirming !== d.id}>
                    <FolderOpen className="h-4 w-4" aria-hidden="true" /> Open
                  </Button>
                  {d.generatedUrl && (
                    <a href={d.generatedUrl} download={`${d.name}.jpg`} target="_blank" rel="noopener noreferrer">
                      <Button type="button" size="sm" variant="secondary">
                        <Download className="h-4 w-4" aria-hidden="true" /> Download
                      </Button>
                    </a>
                  )}
                  {confirming === d.id ? (
                    <>
                      <Button type="button" size="sm" variant="danger" onClick={() => void remove(d)} isLoading={busyId === d.id}>
                        Delete for good
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                        Keep
                      </Button>
                    </>
                  ) : (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(d.id)} aria-label={`Delete ${d.name}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
