/**
 * ResultPanel: the design canvas.
 *
 * Shows the finished design against the original (draggable before/after slider) or on its own with
 * zoom and pan, with fullscreen, download, regenerate and save, a strip of earlier versions, and the
 * boxes around the pieces the on-device finder located. In the Haunted experience a short atmospheric distortion
 * plays once as a result is revealed.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Expand, Minimize, RefreshCw, Save, ZoomIn, ZoomOut, Frame, Eye, EyeOff } from 'lucide-react';
import { BeforeAfterSlider } from '@/components/comparison/BeforeAfterSlider';
import { Button } from '@/components/ui/button';
import type { DesignStyle } from '@/types';
import { cn } from '@/utils/cn';
import { useStudioStore } from '@/stores/studioStore';
import { useIsHaunted } from '@/features/haunting/hauntingStore';
import { revealDistortion } from '@/features/haunting/effects';
import { useFurnitureStore } from '@/features/furniture/furnitureStore';
import type { Box } from '@/features/furniture/detect';
import type { DesignItem } from '@/features/furniture/items';
import { getStudioCopy } from './studioCopy';

type View = 'compare' | 'after' | 'before';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

interface ResultPanelProps {
  /** Identifies the run, so the reveal effect plays once per result. */
  jobId: string;
  beforeSrc: string;
  style: DesignStyle;
  onRegenerate: () => void;
  onSave: () => void;
  busy?: boolean;
}

export function ResultPanel({ jobId, beforeSrc, style, onRegenerate, onSave, busy = false }: ResultPanelProps) {
  const haunted = useIsHaunted();
  const copy = getStudioCopy(haunted);
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const history = useStudioStore((s) => s.history);
  const activeId = useStudioStore((s) => s.activeVersionId);
  const setActive = useStudioStore((s) => s.setActiveVersion);
  const version = history.find((v) => v.id === activeId) ?? history[0] ?? null;
  const afterSrc = version?.url ?? null;

  const { items, versionId, selected, select, showBoxes, setShowBoxes } = useFurnitureStore();
  const boxes = version && versionId === version.id ? items.filter((i): i is DesignItem & { box: Box } => Boolean(i.box)) : [];

  const [view, setView] = useState<View>('compare');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // One atmospheric reveal per result, once the image is ready.
  const revealedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!afterSrc || revealedFor.current === jobId) return;
    revealedFor.current = jobId;
    revealDistortion(rootRef.current);
  }, [afterSrc, jobId]);

  // A different version starts at normal size.
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [afterSrc]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const changeZoom = useCallback((next: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    setZoom(z);
    if (z === 1) setOffset({ x: 0, y: 0 });
  }, []);

  const zoomIn = () => {
    if (view === 'compare') setView('after');
    changeZoom(zoom + ZOOM_STEP);
  };

  const toggleFullscreen = async () => {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      // fullscreen refused by the browser: nothing to do
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') zoomIn();
    else if (e.key === '-') changeZoom(zoom - ZOOM_STEP);
    else if (e.key === '0') changeZoom(1);
  };

  const shown = view === 'before' ? beforeSrc : afterSrc;
  const index = version ? history.length - history.indexOf(version) : 0;

  return (
    <section
      ref={rootRef}
      className="rounded-xl border border-navy-700 bg-navy-800 p-4 sm:p-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:p-4"
      aria-label={copy.resultTitle}
      data-testid="result-panel"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 lg:mb-2 lg:shrink-0">
        <div>
          <h3 className="font-heading text-xl font-semibold text-ivory lg:text-lg">{copy.resultTitle}</h3>
          <p className="text-sm text-ivory/75 lg:sr-only">{copy.resultCaption}</p>
        </div>
        <div role="group" aria-label="View" className="inline-flex overflow-hidden rounded-md border border-navy-600">
          {(['compare', 'after', 'before'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => {
                setView(v);
                if (v === 'compare') changeZoom(1);
              }}
              className={cn(
                'min-h-[40px] px-3 text-xs font-medium capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 lg:min-h-[32px]',
                view === v ? 'bg-amber-600 text-on-accent' : 'bg-navy-900 text-ivory/80 hover:text-ivory'
              )}
            >
              {v === 'compare' ? 'Compare' : v === 'after' ? 'After' : 'Before'}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={stageRef}
        className={cn('relative overflow-hidden rounded-lg bg-navy-900 lg:min-h-0 lg:flex-1', fullscreen && 'flex h-screen w-screen items-center justify-center rounded-none')}
        data-testid="canvas-stage"
        tabIndex={view === 'compare' ? -1 : 0}
        onKeyDown={onKeyDown}
        aria-label={view === 'compare' ? undefined : 'Design image. Press plus or minus to zoom, zero to reset.'}
      >
        {afterSrc ? (
          view === 'compare' ? (
            <div className="relative w-full lg:absolute lg:inset-0">
              <BeforeAfterSlider beforeImage={beforeSrc} afterImage={afterSrc} beforeLabel="Before" afterLabel="After" fitHeight />
            </div>
          ) : (
            <div
              className={cn('flex w-full items-center justify-center lg:absolute lg:inset-0', zoom > 1 ? 'cursor-grab touch-none active:cursor-grabbing' : '')}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div
                className="relative inline-block max-w-full lg:max-h-full"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: 'center', transition: drag.current ? 'none' : 'transform 150ms ease-out' }}
              >
                <img
                  src={shown ?? undefined}
                  alt={view === 'before' ? 'Your original room photo' : 'Your redesigned room'}
                  draggable={false}
                  className={cn('block h-auto max-w-full select-none object-contain', fullscreen ? 'max-h-screen' : 'max-h-[68vh] lg:max-h-full')}
                />
                {view === 'after' && showBoxes &&
                  boxes.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => select(selected === p.id ? null : p.id)}
                      aria-label={`${p.name} found in the design`}
                      aria-pressed={selected === p.id}
                      className={cn(
                        'absolute rounded-sm border-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
                        selected === p.id ? 'border-amber-400 bg-amber-400/20' : 'border-white/70 hover:border-amber-300'
                      )}
                      style={{ left: `${p.box.x * 100}%`, top: `${p.box.y * 100}%`, width: `${p.box.w * 100}%`, height: `${p.box.h * 100}%` }}
                    >
                      <span className="absolute left-0 top-0 max-w-full -translate-y-full truncate rounded-t bg-black/70 px-1 text-[10px] leading-4 text-white">
                        {p.name}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )
        ) : (
          <div className="aspect-video w-full animate-pulse bg-navy-700" role="status" aria-label="Loading result" />
        )}
      </div>

      {/* Tools */}
      <div className="mt-4 flex flex-wrap items-center gap-2 lg:mt-2 lg:shrink-0 lg:gap-1.5" role="toolbar" aria-label="Canvas tools">
        <ToolButton label="Zoom out" onClick={() => changeZoom(zoom - ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}>
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </ToolButton>
        <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-ivory/80 lg:min-w-[2.75rem]" data-testid="zoom-level" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <ToolButton label="Zoom in" onClick={zoomIn} disabled={zoom >= MAX_ZOOM}>
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </ToolButton>
        <ToolButton label="Reset zoom" onClick={() => changeZoom(1)} disabled={zoom === 1}>
          <Frame className="h-4 w-4" aria-hidden="true" />
        </ToolButton>
        {typeof document !== 'undefined' && document.fullscreenEnabled && (
          <ToolButton label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={toggleFullscreen}>
            {fullscreen ? <Minimize className="h-4 w-4" aria-hidden="true" /> : <Expand className="h-4 w-4" aria-hidden="true" />}
          </ToolButton>
        )}
        {boxes.length > 0 && (
          <ToolButton label={showBoxes ? 'Hide furniture boxes' : 'Show furniture boxes'} onClick={() => setShowBoxes(!showBoxes)}>
            {showBoxes ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </ToolButton>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2 lg:gap-1.5">
          {afterSrc && (
            <a href={afterSrc} download={`hoomefy-${style}-${index || 1}.jpg`} data-testid="download-design">
              <Button variant="secondary" size="sm" type="button" className="lg:px-3 lg:py-1.5 lg:text-xs">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download
              </Button>
            </a>
          )}
          <Button variant="secondary" size="sm" type="button" className="lg:px-3 lg:py-1.5 lg:text-xs" onClick={onRegenerate} disabled={busy} data-testid="regenerate">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Regenerate
          </Button>
          <Button size="sm" type="button" className="lg:px-3 lg:py-1.5 lg:text-xs" onClick={onSave} disabled={!afterSrc} data-testid="save-design">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save design
          </Button>
        </div>
      </div>

      <div className="lg:flex lg:shrink-0 lg:items-center lg:gap-3">
      {/* History */}
      {history.length > 1 && (
        <div className="mt-4 lg:mt-2 lg:shrink-0" data-testid="history">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ivory/70 lg:sr-only">Earlier versions</h4>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {history.map((v, i) => {
              const on = v.id === version?.id;
              return (
                <li key={v.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(v.id)}
                    aria-pressed={on}
                    aria-label={`Version ${history.length - i}${v.demo ? ' (demo)' : ''}`}
                    className={cn('h-16 w-24 overflow-hidden rounded-md border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 lg:h-10 lg:w-14', on ? 'border-amber-500' : 'border-navy-700 hover:border-amber-500/60')}
                  >
                    <img src={v.url} alt="" className="h-full w-full object-cover" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {version?.demo && (
        <p className="mt-3 text-xs text-ivory/70 lg:mt-2 lg:min-w-0 lg:flex-1" data-testid="demo-note">
          Demo rendering: a colour-graded version of your photo, not an AI redesign.
        </p>
      )}
      </div>
    </section>
  );
}

function ToolButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-navy-600 bg-navy-900 text-ivory/90 transition-colors hover:border-amber-500 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-40 lg:h-9 lg:w-9"
    >
      {children}
    </button>
  );
}
