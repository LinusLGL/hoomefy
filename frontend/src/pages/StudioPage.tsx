/**
 * StudioPage
 *
 * The design workspace. Desktop: controls | canvas | assistant and furniture. Tablet: collapsible controls
 * beside the canvas, with the furniture panel under it. Mobile: a full-width canvas with a bottom bar that
 * switches between Design, Furniture and Settings.
 *
 * Works identically in the Elegant and Haunted experiences; only copy and styling change
 * (see studioCopy.ts and styles/haunted.css).
 *
 * While an upload or generation is in flight the haunting engine is told the app
 * is busy, so no takeover or anomaly can begin until it finishes.
 */

import { useEffect, useRef, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, RefreshCcw, ImagePlus, Sparkles, SlidersHorizontal, Armchair, Wand2, Trash2 } from 'lucide-react';
import type { FurnitureKey, RoomType } from '@/types';
import { FurniturePicker } from '@/features/mansion/FurniturePicker';
import { SpiritReport } from '@/features/mansion/SpiritReport';
import { MansionProgress } from '@/features/mansion/MansionProgress';
import { activeHouse, useMansionStore, type JobOutcome } from '@/features/mansion/mansionStore';
import { composeInstructions } from '@/features/mansion/spirits';
import { Button } from '@/components/ui/button';
import { FILE_INPUT_ID, UploadContainer } from '@/components/upload/UploadContainer';
import { RoomTypeSelector } from '@/components/studio/RoomTypeSelector';
import { StyleSelector } from '@/components/studio/StyleSelector';
import { PreferencesPanel } from '@/components/studio/PreferencesPanel';
import { AssistantCard } from '@/components/studio/AssistantCard';
import { GenerationProgress } from '@/components/studio/GenerationProgress';
import { ResultPanel } from '@/components/studio/ResultPanel';
import { SidePanel, type SideTab } from '@/components/studio/SidePanel';
import { ConsentDialog } from '@/components/studio/ConsentDialog';
import { SaveDialog } from '@/components/studio/SaveDialog';
import { AiAllowance } from '@/components/studio/AiAllowance';
import { getStudioCopy } from '@/components/studio/studioCopy';
import { useStudioStore } from '@/stores/studioStore';
import { useGeneration } from '@/hooks/useGeneration';
import { useToast } from '@/hooks/useToast';
import { useHauntingStore, useIsHaunted } from '@/features/haunting/hauntingStore';
import { useFurnitureStore } from '@/features/furniture/furnitureStore';
import { grantAiConsent, getProviderMode, hasAiConsent } from '@/features/studio/ai';
import { hasStyleText } from '@/features/studio/prompt';
import { cn } from '@/utils/cn';

type Step = 'upload' | 'customize' | 'generate';
type MobileTab = 'design' | 'furniture' | 'settings';

const PANEL = 'rounded-xl border border-navy-700 bg-navy-800 p-6';

export function StudioPage() {
  const toast = useToast();
  const haunted = useIsHaunted();
  const copy = getStudioCopy(haunted);

  const originalImage = useStudioStore((s) => s.uploadedImage);
  const roomType = useStudioStore((s) => s.roomType);
  const style = useStudioStore((s) => s.selectedStyle);
  const preferences = useStudioStore((s) => s.preferences);
  const history = useStudioStore((s) => s.history);
  const setRoomType = useStudioStore((s) => s.setRoomType);
  const setStyle = useStudioStore((s) => s.setStyle);
  const setPreferences = useStudioStore((s) => s.setPreferences);
  const setUploadedImage = useStudioStore((s) => s.setUploadedImage);
  const { isGenerating, currentJob, errorCode, queue, generate, cancel, clear } = useGeneration();

  // Layout state
  const [mobileTab, setMobileTab] = useState<MobileTab>('design');
  const [controlsOpen, setControlsOpen] = useState(true);
  const [sideTab, setSideTab] = useState<SideTab>('summary');

  // Dialogs
  const [consentOpen, setConsentOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  // Haunted only: spirits are bound to furniture, and replacing it drives them out.
  const replaceFurniture: FurnitureKey[] = preferences.replaceFurniture ?? [];
  const setReplaceFurniture = (next: FurnitureKey[]) => setPreferences({ replaceFurniture: next });
  const room = useMansionStore((s) => (roomType ? activeHouse(s).rooms[roomType] : undefined));
  const registerRoom = useMansionStore((s) => s.registerRoom);
  const applyJob = useMansionStore((s) => s.applyJob);
  const [lastRequest, setLastRequest] = useState<{ roomType: RoomType; replaced: FurnitureKey[] } | null>(null);
  const [outcome, setOutcome] = useState<JobOutcome | null>(null);
  const lastDemoRef = useRef(false);

  // The first photograph of a room decides which spirits live in it.
  const photoSeed = originalImage ? `${originalImage.file.name}:${originalImage.file.size}` : null;
  useEffect(() => {
    if (haunted && roomType && photoSeed) registerRoom(roomType, photoSeed);
  }, [haunted, roomType, photoSeed, registerRoom]);

  // Apply a *completed* design to the mansion exactly once. Failed or cancelled jobs never reach this.
  useEffect(() => {
    if (!haunted || isGenerating || currentJob?.status !== 'completed' || !lastRequest) return;
    const result = applyJob(currentJob.jobId, lastRequest.roomType, lastRequest.replaced);
    if (result) setOutcome(result);
  }, [haunted, isGenerating, currentJob, lastRequest, applyJob]);

  // Tell the haunting engine not to start anything while a generation runs.
  const setBusy = useHauntingStore((s) => s.setBusy);
  useEffect(() => {
    setBusy('generation', isGenerating);
    return () => setBusy('generation', false);
  }, [isGenerating, setBusy]);

  // Lets the page styles lift the ghost and the settings buttons above the phone's bottom bar.
  useEffect(() => {
    document.documentElement.dataset.studioNav = 'true';
    return () => {
      delete document.documentElement.dataset.studioNav;
    };
  }, []);

  // Furniture found in one picture says nothing about the next photograph.
  const photoKey = originalImage?.preview ?? null;
  useEffect(() => {
    useFurnitureStore.getState().reset();
  }, [photoKey]);

  const styleReady = style !== null && hasStyleText(style, preferences.customStyle);
  const isReady = Boolean(originalImage?.inference && roomType && styleReady);
  const hasResult = history.length > 0 && Boolean(originalImage);
  const showProgress = isGenerating || currentJob?.status === 'failed';
  const showResult = !isGenerating && hasResult && Boolean(style);
  // Once a design is running, failed or finished the canvas takes over; the photo stays in the controls panel.
  const hideUpload = Boolean(originalImage) && (showResult || showProgress);
  const currentStep: Step = !originalImage ? 'upload' : !roomType || !styleReady ? 'customize' : 'generate';

  const startGeneration = async (demo = false) => {
    if (!originalImage?.inference || !roomType || !style) {
      toast.error('Missing information', 'Please add a photo and choose a room type and style.');
      return;
    }
    if (!hasStyleText(style, preferences.customStyle)) {
      toast.error('Describe your style', 'Write a few words about the look you want, or pick one of the themes.');
      return;
    }
    // A real AI run sends the photo to Hugging Face, so ask once first.
    if (!demo && getProviderMode() === 'live' && !hasAiConsent()) {
      setConsentOpen(true);
      return;
    }
    lastDemoRef.current = demo;
    setOutcome(null);
    setLastRequest({ roomType, replaced: replaceFurniture });
    setMobileTab('design');
    // Success and failure toasts are raised by useGeneration.
    await generate({
      image: originalImage.inference,
      width: originalImage.width ?? 1024,
      height: originalImage.height ?? 1024,
      roomType,
      style,
      demo,
      preferences: {
        ...preferences,
        replaceFurniture,
        customInstructions: composeInstructions(preferences.customInstructions, replaceFurniture),
      },
    });
  };

  const startOver = () => {
    clear();
    setOutcome(null);
    setLastRequest(null);
    useFurnitureStore.getState().reset();
    useStudioStore.getState().reset();
  };

  const replacePhoto = () => document.getElementById(FILE_INPUT_ID)?.click();

  const assistant = !originalImage
    ? { title: 'Begin', message: copy.messages.welcome }
    : !roomType
    ? { title: 'Select room type', message: copy.messages.selectRoom }
    : !style
    ? { title: 'Choose your style', message: copy.messages.selectStyle }
    : !styleReady
    ? { title: 'Describe your style', message: 'Write a few words about the look you want.' }
    : isGenerating
    ? { title: 'In progress', message: copy.messages.generating }
    : showResult
    ? { title: 'Complete', message: copy.messages.done }
    : { title: 'Ready', message: copy.messages.ready };

  const tips = (
    <section className="space-y-3" aria-label="Quick tips">
      <h3 className="text-sm font-semibold text-ivory">Quick Tips</h3>
      <ul className="space-y-3 text-sm text-ivory/80">
        {[
          'Use well-lit, high-quality photos for best results',
          'Capture the entire room from a corner angle',
          'Try different styles to explore possibilities',
          'Adjust intensity for subtle or dramatic changes',
        ].map((tip) => (
          <li key={tip} className="flex items-start gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">
              •
            </span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      {/* Toolbar */}
      <div className="sticky top-16 z-10 border-b border-navy-700 bg-navy-900/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setControlsOpen((o) => !o)}
              className="hidden h-10 w-10 items-center justify-center rounded-md border border-navy-600 text-ivory/90 hover:border-amber-500 md:flex lg:hidden"
              aria-label={controlsOpen ? 'Hide controls' : 'Show controls'}
              aria-expanded={controlsOpen}
              data-testid="toggle-controls"
            >
              {controlsOpen ? <PanelLeftClose className="h-5 w-5" aria-hidden="true" /> : <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />}
            </button>
            <div>
              <h1 className="font-heading text-xl font-bold text-ivory">Design Studio</h1>
              <p className="text-sm text-ivory/70">{haunted ? 'Reconstruct your space' : 'Transform your space with AI'}</p>
            </div>
          </div>

          <ol className="hidden items-center gap-2 text-sm xl:flex" aria-label="Progress">
            <StepIndicator label="Upload" active={currentStep === 'upload'} complete={!!originalImage} />
            <li aria-hidden="true" className="h-px w-8 bg-navy-600" />
            <StepIndicator label="Customize" active={currentStep === 'customize'} complete={!!(roomType && styleReady)} />
            <li aria-hidden="true" className="h-px w-8 bg-navy-600" />
            <StepIndicator label="Generate" active={currentStep === 'generate'} complete={Boolean(showResult)} />
          </ol>

          <Button onClick={() => void startGeneration(false)} disabled={!isReady || isGenerating} isLoading={isGenerating}>
            {!isGenerating && <Sparkles className="h-4 w-4" aria-hidden="true" />}
            {isGenerating ? copy.generatingLabel : copy.generateLabel}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8">
        <div
          className={cn(
            'grid grid-cols-1 gap-6 lg:grid-cols-12',
            controlsOpen ? 'md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]' : 'md:grid-cols-1'
          )}
        >
          {/* Left: controls (Settings tab on mobile) */}
          <aside
            aria-label="Design controls"
            className={cn(
              'space-y-6 md:row-span-2 lg:col-span-3 lg:col-start-1 lg:row-span-1 lg:row-start-1',
              'lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:self-start lg:overflow-y-auto lg:pr-1',
              mobileTab === 'settings' ? 'block' : 'hidden',
              controlsOpen ? 'md:block' : 'md:hidden lg:block'
            )}
          >
            {originalImage && (
              <div className={cn(PANEL, 'flex items-center gap-4 p-4')} data-testid="photo-row">
                <img src={originalImage.preview} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ivory">{originalImage.file.name}</p>
                  <p className="text-xs text-ivory/70">
                    {originalImage.originalWidth && originalImage.originalHeight ? `${originalImage.originalWidth} × ${originalImage.originalHeight}` : 'Ready'}
                  </p>
                  <div className="mt-1 flex gap-3">
                    <button type="button" onClick={replacePhoto} disabled={isGenerating} className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover disabled:opacity-50">
                      <ImagePlus className="h-3 w-3" aria-hidden="true" /> Replace photo
                    </button>
                    <button type="button" onClick={() => setUploadedImage(null)} disabled={isGenerating} className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-ivory/75 hover:text-danger disabled:opacity-50">
                      <Trash2 className="h-3 w-3" aria-hidden="true" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={cn(PANEL, 'space-y-6')}>
              <h2 className="font-heading text-lg font-semibold text-ivory">Room Details</h2>
              <RoomTypeSelector selected={roomType} onSelect={setRoomType} disabled={isGenerating} />
            </div>

            <div className={PANEL}>
              <StyleSelector
                selected={style}
                onSelect={setStyle}
                customStyle={preferences.customStyle ?? ''}
                onCustomStyleChange={(text) => setPreferences({ customStyle: text })}
                disabled={isGenerating}
              />
            </div>

            <div className={PANEL}>
              <PreferencesPanel preferences={preferences} onChange={setPreferences} disabled={isGenerating} />
            </div>

            <div className={PANEL}>
              <FurniturePicker
                title={copy.furnitureTitle}
                hint={copy.furnitureHint}
                roomType={roomType}
                selected={replaceFurniture}
                onChange={setReplaceFurniture}
                boundSpirits={haunted ? room?.spirits : undefined}
                disabled={isGenerating}
              />
            </div>

            <AiAllowance />

            <Button type="button" variant="ghost" className="w-full" onClick={startOver} disabled={isGenerating} data-testid="reset-controls">
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Reset everything
            </Button>
          </aside>

          {/* Center: photo, progress, canvas (Design tab on mobile) */}
          <section
            aria-label="Design canvas"
            className={cn(
              'min-w-0 space-y-6 lg:col-span-6 lg:col-start-4 lg:row-start-1',
              mobileTab === 'design' ? 'block' : 'hidden',
              'md:block'
            )}
          >
            {/* The file input must stay in the page (hidden) so Replace photo can open it. */}
            <div className={cn(PANEL, hideUpload && 'hidden')}>
              <h2 className="mb-4 font-heading text-lg font-semibold text-ivory">{copy.uploadTitle}</h2>
              <UploadContainer collapsed={hideUpload} />
              {!originalImage && <p className="sr-only">Add a photo to begin.</p>}
            </div>

            {originalImage && (!roomType || !styleReady) && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-600/40 bg-navy-800 p-4 md:hidden" data-testid="settings-callout">
                <p className="text-sm text-ivory/85">Choose a room type and style to continue.</p>
                <Button type="button" size="sm" variant="secondary" onClick={() => setMobileTab('settings')}>
                  Open settings
                </Button>
              </div>
            )}

            {haunted && originalImage && roomType && <SpiritReport roomType={roomType} />}

            {showProgress && (
              <GenerationProgress
                job={currentJob}
                imageSrc={originalImage?.preview ?? null}
                onCancel={cancel}
                queue={queue}
                errorCode={errorCode}
                onRetry={() => void startGeneration(lastDemoRef.current)}
                onDemo={getProviderMode() === 'live' ? () => void startGeneration(true) : undefined}
              />
            )}

            {showResult && originalImage && style && (
              <ResultPanel
                jobId={currentJob?.jobId ?? 'restored'}
                beforeSrc={originalImage.preview}
                style={style}
                outcome={haunted ? outcome : null}
                replacedAny={(lastRequest?.replaced.length ?? 0) > 0}
                onRegenerate={() => void startGeneration(lastDemoRef.current)}
                onSave={() => setSaveOpen(true)}
                busy={isGenerating}
              />
            )}
          </section>

          {/* Right: assistant and furniture (Furniture tab on mobile) */}
          <aside
            aria-label="Design assistant"
            className={cn(
              'min-w-0 space-y-6 lg:col-span-3 lg:col-start-10 lg:row-start-1',
              'lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:self-start lg:overflow-y-auto lg:pr-1',
              controlsOpen ? 'md:col-start-2' : 'md:col-start-1',
              mobileTab === 'furniture' ? 'block' : 'hidden',
              'md:block'
            )}
          >
            <AssistantCard {...assistant} />
            {haunted && <MansionProgress />}
            <SidePanel tab={sideTab} onTabChange={setSideTab} tips={tips} />
          </aside>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Studio sections" className="fixed inset-x-0 bottom-0 z-20 border-t border-navy-700 bg-navy-900/95 backdrop-blur-md md:hidden" data-testid="mobile-nav">
        <ul className="mx-auto grid max-w-xl grid-cols-3">
          {(
            [
              { id: 'design', label: 'Design', icon: Wand2 },
              { id: 'furniture', label: 'Furniture', icon: Armchair },
              { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setMobileTab(id)}
                aria-current={mobileTab === id ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] w-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                  mobileTab === id ? 'text-accent' : 'text-ivory/75'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <ConsentDialog
        open={consentOpen}
        onCancel={() => setConsentOpen(false)}
        onAccept={() => {
          grantAiConsent();
          setConsentOpen(false);
          void startGeneration(false);
        }}
        onDemo={() => {
          setConsentOpen(false);
          void startGeneration(true);
        }}
      />
      <SaveDialog open={saveOpen} onClose={() => setSaveOpen(false)} />
    </div>
  );
}

function StepIndicator({ label, active, complete }: { label: string; active: boolean; complete: boolean }) {
  return (
    <li className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
      <span
        aria-hidden="true"
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors',
          complete ? 'bg-success text-paper' : active ? 'bg-amber-600 text-on-accent' : 'bg-navy-700 text-ivory/75'
        )}
      >
        {complete ? '✓' : '•'}
      </span>
      <span className={cn('text-sm font-medium', active ? 'text-ivory' : complete ? 'text-success' : 'text-ivory/75')}>
        {label}
        {complete && <span className="sr-only"> (complete)</span>}
      </span>
    </li>
  );
}
