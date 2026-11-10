/**
 * StudioPage
 *
 * The design workspace. Laptop and desktop (1024px and up): one fixed screen, controls | canvas | preferences
 * and assistant, with no page scroll (see PageLayout "fit"). Tablet: collapsible controls beside the canvas,
 * with the furniture panel under it. Mobile: a full-width canvas with a bottom bar that switches between
 * Design, Furniture and Settings.
 *
 * Works identically in the Elegant and Haunted experiences; only copy and styling change
 * (see studioCopy.ts and styles/haunted.css).
 *
 * While an upload or generation is in flight the haunting engine is told the app
 * is busy, so no takeover or anomaly can begin until it finishes.
 */

import { useEffect, useRef, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, RefreshCcw, ImagePlus, Sparkles, SlidersHorizontal, Armchair, Wand2, Trash2, Flame } from 'lucide-react';
import type { FurnitureKey, RoomType } from '@/types';
import { FurniturePicker } from '@/features/mansion/FurniturePicker';
import { SpiritReport } from '@/features/mansion/SpiritReport';
import { activeHouse, useMansionStore, type JobOutcome } from '@/features/mansion/mansionStore';
import { composeInstructions } from '@/features/mansion/spirits';
import { Button } from '@/components/ui/button';
import { FILE_INPUT_ID, UploadContainer } from '@/components/upload/UploadContainer';
import { PrivacyNote } from '@/components/upload/PrivacyNote';
import { stageFromJob } from '@/components/studio/generationStage';
import {
  BEGIN_READY,
  BEGIN_WAITING,
  BoardBackdrop,
  CANDLES,
  CHAMBER,
  CandleRitual,
  NOT_READY_BODY,
  NOT_READY_TITLE,
  PolaroidStage,
  STAGE_LINES,
  preloadRitualAssets,
  type StageState,
} from '@/features/ritual';
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
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useHauntingStore, useIsHaunted } from '@/features/haunting/hauntingStore';
import { useFurnitureStore } from '@/features/furniture/furnitureStore';
import { grantAiConsent, getProviderMode, hasAiConsent } from '@/features/studio/ai';
import { hasStyleText } from '@/features/studio/prompt';
import { cn } from '@/utils/cn';

type Step = 'upload' | 'customize' | 'generate';
type MobileTab = 'design' | 'furniture' | 'settings';

const PANEL = 'rt-panel rounded-xl border border-navy-700 bg-navy-800 p-6 lg:p-2.5';

export function StudioPage() {
  const toast = useToast();
  const haunted = useIsHaunted();
  const copy = getStudioCopy(haunted);
  // On laptop and desktop screens the studio is one fixed screen: a few controls move to the right-hand column there.
  const wide = useMediaQuery('(min-width: 1024px)');

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

  // Haunted only: the candle ritual that begins a design. The consent question, when it is needed, comes first.
  const [ritualOpen, setRitualOpen] = useState(false);
  const ritualDemoRef = useRef(false);
  const consentForRitual = useRef(false);

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

  // Tell the haunting engine not to start anything while a generation runs, or the ritual is under way.
  const setBusy = useHauntingStore((s) => s.setBusy);
  useEffect(() => {
    setBusy('generation', isGenerating);
    return () => setBusy('generation', false);
  }, [isGenerating, setBusy]);
  useEffect(() => {
    setBusy('ritual', ritualOpen);
    return () => setBusy('ritual', false);
  }, [ritualOpen, setBusy]);

  // The Ouija board is the table of the Haunted studio: the page lets it show through.
  useEffect(() => {
    if (!haunted) return undefined;
    document.documentElement.dataset.studioBoard = 'true';
    return () => {
      delete document.documentElement.dataset.studioBoard;
    };
  }, [haunted]);

  // Fetch the ritual chamber while the visitor is still choosing a style, so it opens without a wait.
  const hasPhoto = Boolean(originalImage);
  useEffect(() => {
    if (haunted && hasPhoto) preloadRitualAssets([CHAMBER.src, ...CANDLES.map((c) => c.patch.src)]);
  }, [haunted, hasPhoto]);

  // Lets the page styles lift the ghost and the settings buttons above the phone's bottom bar.
  useEffect(() => {
    document.documentElement.dataset.studioNav = 'true';
    document.documentElement.dataset.studioFit = 'true';
    return () => {
      delete document.documentElement.dataset.studioNav;
      delete document.documentElement.dataset.studioFit;
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

  // Haunted: a design begins with the candle ritual. Lighting the fifth candle starts the design (see CandleRitual).
  const needsConsent = () => getProviderMode() === 'live' && !hasAiConsent();
  const beginRitual = (demo: boolean) => {
    ritualDemoRef.current = demo;
    setRitualOpen(true);
  };
  const developPhotograph = () => {
    if (isGenerating || ritualOpen) return;
    if (!isReady) {
      toast.error(NOT_READY_TITLE, NOT_READY_BODY);
      return;
    }
    if (needsConsent()) {
      consentForRitual.current = true;
      setConsentOpen(true);
      return;
    }
    beginRitual(false);
  };
  const develop = () => (haunted ? developPhotograph() : void startGeneration(false));

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
    <section className="space-y-3 lg:space-y-1.5 lg:[@media(max-height:899px)]:hidden" aria-label="Quick tips">
      <h3 className="text-sm font-semibold text-ivory">Quick Tips</h3>
      <ul className="space-y-3 text-sm text-ivory/80 lg:space-y-1 lg:text-xs">
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

  const photoRow = originalImage && (
    <div className={cn(PANEL, 'flex items-center gap-4 p-4 lg:gap-2 lg:p-1.5')} data-testid="photo-row">
      <img src={originalImage.preview} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover lg:h-8 lg:w-8" />
      <div className="min-w-0 flex-1 lg:flex lg:items-center lg:gap-2">
        <p className="truncate text-sm font-medium text-ivory lg:min-w-0 lg:flex-1 lg:text-xs">
          {originalImage.file.name}
          <span className="hidden font-normal text-ivory/60 lg:inline">
            {originalImage.originalWidth && originalImage.originalHeight ? ` · ${originalImage.originalWidth} × ${originalImage.originalHeight}` : ''}
          </span>
        </p>
        <p className="text-xs text-ivory/70 lg:hidden">
          {originalImage.originalWidth && originalImage.originalHeight ? `${originalImage.originalWidth} × ${originalImage.originalHeight}` : 'Ready'}
        </p>
        <div className="mt-1 flex gap-3 lg:mt-0 lg:shrink-0 lg:gap-1">
          <button type="button" onClick={replacePhoto} disabled={isGenerating} className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover disabled:opacity-50 lg:min-h-[28px] lg:min-w-[28px] lg:justify-center" title="Replace photo">
            <ImagePlus className="h-3 w-3 lg:h-4 lg:w-4" aria-hidden="true" /> <span className="lg:sr-only">Replace photo</span>
          </button>
          <button type="button" onClick={() => setUploadedImage(null)} disabled={isGenerating} className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-ivory/75 hover:text-danger disabled:opacity-50 lg:min-h-[28px] lg:min-w-[28px] lg:justify-center" title="Remove">
            <Trash2 className="h-3 w-3 lg:h-4 lg:w-4" aria-hidden="true" /> <span className="lg:sr-only">Remove</span>
          </button>
        </div>
      </div>
    </div>
  );

  const preferencesCard = (
    <div className={PANEL}>
      <PreferencesPanel preferences={preferences} onChange={setPreferences} disabled={isGenerating} />
    </div>
  );

  const spiritReport = haunted && originalImage && roomType ? <SpiritReport roomType={roomType} /> : null;

  // The polaroid on the Ouija board (Haunted): what it shows, and what the visitor can do with it.
  const stageState: StageState = !originalImage ? 'empty' : showProgress ? 'working' : isReady ? 'ready' : 'photo';
  const beginRitualButton =
    originalImage && !showProgress ? (
      <button
        type="button"
        className="rt-begin"
        data-ready={isReady ? 'true' : 'false'}
        data-testid="begin-ritual"
        aria-label="Begin the candle ritual to develop this photograph"
        onClick={developPhotograph}
      >
        <span className="rt-begin__pill" aria-hidden="true">
          <Flame className="h-[1.1em] w-[1.1em]" />
          {isReady ? BEGIN_READY : BEGIN_WAITING}
        </span>
      </button>
    ) : undefined;

  return (
    <div className="min-h-screen pb-24 md:pb-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:pb-0">
      {haunted && <BoardBackdrop dim={!wide} />}
      {/* Toolbar */}
      <div className="sticky top-16 z-10 border-b border-navy-700 bg-navy-900/95 backdrop-blur-md lg:static lg:shrink-0">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:flex-nowrap lg:gap-3 lg:px-8 lg:py-1.5">
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
            <div className="lg:flex lg:items-baseline lg:gap-3">
              <h1 className="font-heading text-xl font-bold text-ivory lg:text-lg lg:leading-tight">Design Studio</h1>
              <p className="text-sm text-ivory/70 lg:hidden xl:block xl:text-xs">{haunted ? 'Reconstruct your space' : 'Transform your space with AI'}</p>
            </div>
          </div>

          <ol className="hidden items-center gap-2 text-sm xl:flex" aria-label="Progress">
            <StepIndicator label="Upload" active={currentStep === 'upload'} complete={!!originalImage} />
            <li aria-hidden="true" className="h-px w-8 bg-navy-600" />
            <StepIndicator label="Customize" active={currentStep === 'customize'} complete={!!(roomType && styleReady)} />
            <li aria-hidden="true" className="h-px w-8 bg-navy-600" />
            <StepIndicator label="Generate" active={currentStep === 'generate'} complete={Boolean(showResult)} />
          </ol>

          <div className="flex items-center gap-2">
            {wide && (
              <Button type="button" variant="ghost" size="sm" className="lg:min-h-[36px]" onClick={startOver} disabled={isGenerating} data-testid="reset-controls" aria-label="Reset everything" title="Reset everything">
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Reset
              </Button>
            )}
            <Button className="lg:min-h-[36px] lg:py-1" onClick={develop} disabled={!isReady || isGenerating} isLoading={isGenerating}>
              {!isGenerating && <Sparkles className="h-4 w-4" aria-hidden="true" />}
              {isGenerating ? copy.generatingLabel : copy.generateLabel}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-6 lg:min-h-0 lg:w-full lg:flex-1 lg:px-8 lg:py-2">
        <div
          className={cn(
            'grid grid-cols-1 gap-6 lg:h-full lg:grid-cols-[260px_minmax(0,1fr)_280px] lg:gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]',
            controlsOpen ? 'md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]' : 'md:grid-cols-1'
          )}
        >
          {/* Left: controls (Settings tab on mobile) */}
          <aside
            aria-label="Design controls"
            className={cn(
              'space-y-6 md:row-span-2 lg:col-start-1 lg:row-span-1 lg:row-start-1',
              'lg:h-full lg:min-h-0 lg:space-y-1.5 lg:overflow-y-auto lg:pb-14 lg:pr-1',
              mobileTab === 'settings' ? 'block' : 'hidden',
              controlsOpen ? 'md:block' : 'md:hidden lg:block'
            )}
          >
            {photoRow}

            <div className={cn(PANEL, 'space-y-6 lg:space-y-0')}>
              <h2 className="font-heading text-lg font-semibold text-ivory lg:sr-only">Room Details</h2>
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



            {!wide && preferencesCard}

            <div className={PANEL}>
              {/* On wide screens the haunting report sits in the card of the furniture it refers to; on small screens it is above the canvas. */}
              {wide && spiritReport}
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

            {!wide && <AiAllowance />}

            {!wide && (
              <Button type="button" variant="ghost" className="w-full" onClick={startOver} disabled={isGenerating} data-testid="reset-controls">
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Reset everything
              </Button>
            )}
          </aside>

          {/* Center: photo, progress, canvas (Design tab on mobile) */}
          <section
            aria-label="Design canvas"
            className={cn(
              'min-w-0 space-y-6 lg:col-start-2 lg:row-start-1',
              'lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-2',
              mobileTab === 'design' ? 'block' : 'hidden',
              'md:block'
            )}
          >
            {haunted ? (
              // Haunted: the photograph goes on the polaroid on the Ouija board. It stays mounted (hidden) once the design
              // is showing, so Replace photo can still open the file chooser.
              <PolaroidStage
                wide={wide}
                state={stageState}
                title={copy.uploadTitle}
                line={STAGE_LINES[stageState]}
                hidden={showResult}
                below={
                  showProgress ? (
                    <GenerationProgress
                      variant="board"
                      job={currentJob}
                      imageSrc={originalImage?.preview ?? null}
                      onCancel={cancel}
                      queue={queue}
                      errorCode={errorCode}
                      onRetry={() => void startGeneration(lastDemoRef.current)}
                      onDemo={getProviderMode() === 'live' ? () => void startGeneration(true) : undefined}
                    />
                  ) : (
                    <PrivacyNote className="rt-plate rt-privacy flex items-start gap-2 p-2 text-[11px] leading-snug text-ivory/85" />
                  )
                }
              >
                <UploadContainer variant="polaroid" stage={showProgress ? stageFromJob(currentJob) : null} overlay={beginRitualButton} />
              </PolaroidStage>
            ) : (
              // The file input must stay in the page (hidden) so Replace photo can open it.
              <div className={cn(PANEL, hideUpload ? 'hidden' : 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col')}>
                <h2 className="mb-4 font-heading text-lg font-semibold text-ivory lg:mb-2 lg:shrink-0 lg:text-base">{copy.uploadTitle}</h2>
                <div className="lg:min-h-0 lg:flex-1">
                  <UploadContainer collapsed={hideUpload} />
                </div>
                {!originalImage && <p className="sr-only">Add a photo to begin.</p>}
              </div>
            )}

            {originalImage && (!roomType || !styleReady) && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-600/40 bg-navy-800 p-4 md:hidden" data-testid="settings-callout">
                <p className="text-sm text-ivory/85">Choose a room type and style to continue.</p>
                <Button type="button" size="sm" variant="secondary" onClick={() => setMobileTab('settings')}>
                  Open settings
                </Button>
              </div>
            )}

            {!wide && spiritReport}

            {showProgress && !haunted && (
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
              'min-w-0 space-y-6 lg:col-start-3 lg:row-start-1',
              'lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-2 lg:overflow-y-auto lg:pr-1',
              controlsOpen ? 'md:col-start-2' : 'md:col-start-1',
              mobileTab === 'furniture' ? 'block' : 'hidden',
              'md:block'
            )}
          >
            <AssistantCard {...assistant} className="lg:shrink-0" />
            {wide && <div className="lg:shrink-0">{preferencesCard}</div>}
            <SidePanel tab={sideTab} onTabChange={setSideTab} tips={tips} />
            {wide && (
              <div className="lg:shrink-0">
                <AiAllowance />
              </div>
            )}
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
        onCancel={() => {
          consentForRitual.current = false;
          setConsentOpen(false);
        }}
        onAccept={() => {
          grantAiConsent();
          setConsentOpen(false);
          if (consentForRitual.current) beginRitual(false);
          else void startGeneration(false);
          consentForRitual.current = false;
        }}
        onDemo={() => {
          setConsentOpen(false);
          if (consentForRitual.current) beginRitual(true);
          else void startGeneration(true);
          consentForRitual.current = false;
        }}
      />
      {haunted && <CandleRitual open={ritualOpen} onComplete={() => void startGeneration(ritualDemoRef.current)} onClose={() => setRitualOpen(false)} />}
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
