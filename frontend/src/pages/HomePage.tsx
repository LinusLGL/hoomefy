/**
 * Home page.
 *
 * Elegant by default: an editorial interior-design landing page. It contains the
 * hooks the haunting engine needs, none of which are visible as horror cues:
 *   [data-hero-heading] / [data-hero-sub]  text that fragments during the takeover
 *   [data-distort]                         elements that receive the warp filters
 *   SceneFrame (hero)                      image that warps room -> mansion
 *   HauntedMirror                          a "statement mirror" product tile
 *   [data-haunt-trigger]                   the section whose arrival starts the reveal
 * Copy changes with the experience so the same page reads correctly after the takeover.
 */

import { Fragment, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, ChevronRight, Home as HomeIcon, ImageIcon, Maximize2, Palette, Sofa, Sparkles, Wand2, type LucideIcon } from 'lucide-react';
import { ROUTES } from '@/utils/constants';
import { HeroArt } from '@/components/landing/HeroArt';
import { GhostHouseIcon } from '@/components/icons/GhostHouseIcon';
import { GlitchText } from '@/features/haunting/GlitchText';
import { SceneFrame } from '@/features/haunting/SceneFrame';
import { HauntedMirror } from '@/features/haunting/HauntedMirror';
import { ParanormalShadow } from '@/features/haunting/ParanormalShadow';
import { useLurkOnHover } from '@/features/haunting/shadowEffects';
import { ScrollHauntingDirector } from '@/features/haunting/ScrollHauntingDirector';
import { useHauntingStore, useIsHaunted } from '@/features/haunting/hauntingStore';
import { useHauntingEnv } from '@/features/haunting/hauntingEnvContext';
import { useHolyWaterStore } from '@/features/holywater/holyWaterStore';
import { ROOMS, type RoomId } from '@/features/holywater/rooms';

interface StyleCardProps {
  name: string;
  blurb: string;
  swatch: string;
  /** The Elegant photograph for this style (16:9, built by scripts/build-style-images.mjs). */
  image: string;
  imageAlt: string;
  haunted: boolean;
  hauntedName: string;
  hauntedBlurb: string;
  /** The Haunted room this card shows; clicking it opens the painting full-screen. */
  room: RoomId;
}

function StyleCard({ name, blurb, swatch, image, imageAlt, haunted, hauntedName, hauntedBlurb, room }: StyleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const horrorEnabled = useHauntingStore((s) => s.horrorEnabled);
  const { reducedMotion } = useHauntingEnv();
  useLurkOnHover(cardRef, shadowRef, horrorEnabled && !reducedMotion);

  return (
    <div
      ref={cardRef}
      data-distort=""
      data-card-shadow=""
      className={`hf-frame group relative overflow-hidden rounded-xl border border-navy-700 shadow-sm transition-shadow hover:shadow-lg ${haunted ? 'bg-navy-800' : 'bg-paper'}`}
    >
      {haunted ? (
        <div className="hf-room">
          <img
            className="hf-room__image"
            src={ROOMS[room].thumb}
            alt=""
            width={800}
            height={450}
            loading="lazy"
            decoding="async"
          />
          <button
            type="button"
            className="hf-room__open"
            data-testid={`room-card-${room}`}
            aria-haspopup="dialog"
            aria-label={`${hauntedName}: view the room full-screen`}
            onClick={() => useHolyWaterStore.getState().openRoomViewer(room)}
          >
            <Maximize2 className="hf-room__icon" aria-hidden="true" />
          </button>
        </div>
      ) : (
        // The swatch shows while the photograph loads. The photograph is 16:9, like the Haunted room cards.
        <div className="aspect-video w-full" style={{ background: swatch }}>
          <img className="h-full w-full object-cover" src={image} alt={imageAlt} width={960} height={540} loading="lazy" decoding="async" />
        </div>
      )}
      <ParanormalShadow ref={shadowRef} className="hf-card-shadow" style={{ right: '8%', top: '4%', width: '22%', height: '46%' }} />
      <div className="p-6">
        <h3 className="font-heading text-2xl font-semibold text-ivory">{haunted ? hauntedName : name}</h3>
        <p className="mt-2 text-ivory/75">{haunted ? hauntedBlurb : blurb}</p>
      </div>
    </div>
  );
}

const STYLE_CARDS: Omit<StyleCardProps, 'haunted'>[] = [
  {
    name: 'Scandinavian',
    blurb: 'Pale oak, soft wool and quiet light for rooms that breathe.',
    hauntedName: 'The Drawing Room',
    hauntedBlurb: 'Pale wood, candle-gold light, and a chair someone has only just left.',
    swatch: 'linear-gradient(135deg, #efe7d6 0%, #d9ccb0 55%, #b9a77f 100%)',
    image: '/images/styles/scandinavian.webp',
    imageAlt: 'A bright Scandinavian kitchen in light oak, with an island, rattan stools and soft daylight',
    room: 'drawing-room',
  },
  {
    name: 'Japandi',
    blurb: 'Warm minimalism: low lines, natural texture, calm shadows.',
    hauntedName: 'The Library',
    hauntedBlurb: 'Low shelves, long shadows, and a book that turns its own pages.',
    swatch: 'linear-gradient(135deg, #cfc5ad 0%, #8e8468 55%, #5c5440 100%)',
    image: '/images/styles/japandi.webp',
    imageAlt: 'A Japandi rooftop tea terrace at dusk, with a low oak table, a bonsai and paper lanterns',
    room: 'library',
  },
  {
    name: 'Modern Classic',
    blurb: 'Timeless proportions with a contemporary hand.',
    hauntedName: 'The Grand Ballroom',
    hauntedBlurb: 'Chandeliers, a cold dance floor, and a waltz that never quite ends.',
    swatch: 'linear-gradient(135deg, #e8dfcc 0%, #b79d6c 55%, #7a5f33 100%)',
    image: '/images/styles/modern-classic.webp',
    imageAlt: 'A modern classic living room with a crystal chandelier, a cream sectional and marble floors',
    room: 'grand-ballroom',
  },
];

const STEPS = [
  {
    icon: Camera,
    title: 'Upload a photo',
    body: 'Any room, any light. A single photograph is all we need.',
  },
  {
    icon: Palette,
    title: 'Choose a style',
    body: 'Ten curated looks, from calm minimalism to bold luxury.',
  },
  {
    icon: Sparkles,
    title: 'Receive your design',
    body: 'A fully reimagined version of your space, ready to compare.',
  },
];

/** The three steps shown along the foot of the Haunted landing page. */
const HAUNTED_STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ImageIcon, title: 'Upload Your Room', body: 'Capture your space' },
  { icon: Wand2, title: 'Reimagine with AI', body: 'Transform in your style' },
  { icon: Sofa, title: 'Discover New Spaces', body: 'Beautiful, eerie, and beyond' },
];

/** The framed scene in the Haunted hero (a realistic render of the mansion drawing room, the same picture as the Drawing Room card). */
const HAUNTED_HERO_PHOTO = '/images/haunted/hero-room.jpg';
/** Candles, portrait, cobwebs and candelabra cut from the same design, so the edges match it. */
const HAUNTED_ART_LEFT = '/images/haunted/foreground-left.webp';
const HAUNTED_ART_RIGHT = '/images/haunted/foreground-right.webp';

/** The photograph in the Elegant hero (cropped from the "Scandinavian Dreams by Hoomefy" design). */
const HERO_PHOTO = '/images/hero/scandinavian-room.jpg';

export default function HomePage() {
  const haunted = useIsHaunted();
  const horrorEnabled = useHauntingStore((s) => s.horrorEnabled);

  return (
    <div className="min-h-screen">
      <ScrollHauntingDirector />

      {/* The hero and the start of the styles section share one measuring box (see elegant.css). */}
      <div className="hf-top">
      {/* Hero */}
      <section className="hf-hero relative px-6 pb-20 pt-12 lg:px-8 lg:pb-28 lg:pt-20">
        {/* Elegant only: the sage waves, and the foreground leaves at the left edge */}
        <div className="hf-hero__art" aria-hidden="true">
          <HeroArt />
        </div>
        <img className="hf-hero__leaves" src="/images/hero/hero-leaves.png" alt="" aria-hidden="true" />

        {/* Haunted only: the design's candles, portrait, cobwebs and candelabra, hidden in Elegant by CSS */}
        {horrorEnabled && (
          <div className="hf-art" aria-hidden="true">
            <img className="hf-art__left" src={HAUNTED_ART_LEFT} alt="" decoding="async" />
            <img className="hf-art__right" src={HAUNTED_ART_RIGHT} alt="" decoding="async" />
            <span className="hf-art__flame hf-art__flame--tall" />
            <span className="hf-art__flame hf-art__flame--short" />
            <svg className="hf-art__blood" viewBox="0 0 520 130" fill="none">
              <path className="hf-art__swoosh" d="M160 40C235 74 340 72 456 30 346 56 245 62 160 40Z" />
              <path className="hf-art__swoosh" d="M8 15C34 9 58 9 78 11 54 15 30 17 8 15Z" />
              <path className="hf-art__drip hf-art__drip--a" d="M82.500 6h5c.5 24 1 46 0 62 2 1.500 3.500 3.500 3.500 6a6 6 0 1 1-12 0c0-2.500 1.500-4.500 3.500-6-1-16-1-38 0-62Z" />
              <path className="hf-art__drip hf-art__drip--b" d="M145.500 8h5c0 20 .5 38 0 50 2 1.500 3 3 3 5a5.500 5.500 0 1 1-11 0c0-2 1-3.500 3-5-.5-12-.5-30 0-50Z" />
            </svg>
          </div>
        )}

        <div className="hf-hero__inner mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div className="hf-hero__copy space-y-8" data-distort="">
            {!haunted && (
              <p className="hf-eyebrow text-sm font-semibold uppercase tracking-[0.3em] text-accent">
                <span>AI Interior Design</span>
                <span className="hf-eyebrow__rule" aria-hidden="true" />
              </p>
            )}
            <GlitchText
              as="h1"
              text={haunted ? 'Welcome to\nHoomefy' : 'Your Dream Home, Reimagined.'}
              emphasize={haunted ? 'Hoomefy' : 'Reimagined.'}
              className="font-heading text-5xl font-bold leading-[1.05] text-ivory md:text-6xl lg:text-7xl"
              extra={{ 'data-hero-heading': '' }}
            />
            {haunted && (
              <div className="hf-hero__ornament" aria-hidden="true">
                <GhostHouseIcon className="hf-hero__ornament-icon" />
              </div>
            )}
            <GlitchText
              as="p"
              text={
                haunted
                  ? 'A place where beautiful spaces are reimagined...\nbut be warned — some rooms here\nstill remember their past.'
                  : 'One photograph is all it takes. Hoomefy redesigns your room in the style you choose, with the proportions, windows and light of your real space.'
              }
              emphasize={haunted ? 'remember their past.' : undefined}
              className="max-w-xl text-xl leading-relaxed text-ivory/80"
              extra={{ 'data-hero-sub': '' }}
            />
            <div className="flex flex-col items-start gap-4 pt-2 sm:flex-row sm:items-center">
              <Link
                to={ROUTES.studio}
                className="hf-btn hf-btn--primary inline-flex items-center gap-3 rounded-md bg-amber-600 px-8 py-4 text-lg font-bold text-on-accent shadow-lg transition-all duration-200 hover:bg-amber-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-navy-900"
              >
                Design My Room
                <ArrowRight className="hf-btn__arrow h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                to={ROUTES.howItWorks}
                className="hf-btn hf-btn--secondary rounded-md border-2 border-amber-600 px-8 py-4 text-lg font-semibold text-accent transition-colors duration-200 hover:bg-amber-600 hover:text-on-accent focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                How It Works
              </Link>
            </div>
          </div>

          <div className="hf-hero-frame">
            <SceneFrame
              id="hero"
              hero
              photo={HERO_PHOTO}
              toPhoto={HAUNTED_HERO_PHOTO}
              label={haunted ? 'A candle-lit abandoned mansion drawing room with a worn velvet sofa, a lit fireplace, a chandelier and a pale ghost by the window' : 'A bright Scandinavian living room with a cream sofa, a round oak table and a floor lamp'}
              className="hf-hero-card shadow-2xl"
            />
            {/* Elegant only: names the style shown. It sits exactly over the label drawn into the photograph. */}
            <aside className="hf-hero__card" aria-label="Scandinavian style">
              <HomeIcon className="hf-hero__card-icon" aria-hidden="true" />
              <span className="hf-hero__card-rule" aria-hidden="true" />
              <div>
                <p className="hf-hero__card-title">Scandinavian</p>
                <p className="hf-hero__card-text">Pale oak, soft wool and quiet light for rooms that breathe.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Haunted only: the three steps along the foot of the landing page */}
      {haunted && (
        <section className="hf-steps" aria-label="How it works">
          <div className="hf-steps__divider" aria-hidden="true">
            <GhostHouseIcon className="hf-steps__divider-icon" />
          </div>
          <div className="hf-steps__list">
            {HAUNTED_STEPS.map((step, i) => (
              <Fragment key={step.title}>
                <div className="hf-steps__item" data-distort="">
                  <step.icon className="hf-steps__icon" aria-hidden="true" strokeWidth={1.3} />
                  <h3 className="hf-steps__title">{step.title}</h3>
                  <p className="hf-steps__body">{step.body}</p>
                </div>
                {i < HAUNTED_STEPS.length - 1 && <ChevronRight className="hf-steps__chevron" aria-hidden="true" strokeWidth={1.4} />}
              </Fragment>
            ))}
          </div>
        </section>
      )}

      {/* Curated styles */}
      <section className="hf-styles hf-red-mist bg-navy-800 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="hf-ornament" aria-hidden="true">
              <svg width="26" height="16" viewBox="0 0 26 16" fill="currentColor">
                <path d="M13 0l3 6 6-1-4 5 4 5-6-1-3 6-3-6-6 1 4-5-4-5 6 1z" opacity="0.9" />
              </svg>
            </div>
            <h2 className="font-heading text-4xl font-bold text-ivory md:text-5xl">
              {haunted ? 'Haunted Styles' : 'Styles, curated'}
            </h2>
            <p className="mt-5 text-xl text-ivory/75">
              {haunted
                ? 'Each style is a room with a story that lingers.'
                : 'Each look is composed by hand, so the result feels designed rather than generated.'}
            </p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STYLE_CARDS.map((card) => (
              <StyleCard key={card.name} {...card} haunted={haunted} />
            ))}
          </div>
        </div>
      </section>
      </div>

      {/* How it works (Haunted shows the same steps along the foot of the hero) */}
      {!haunted && (
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-heading text-4xl font-bold text-ivory md:text-5xl">
            {haunted ? 'How the haunting works' : 'Three simple steps'}
          </h2>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center md:text-left" data-distort="">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-navy-600 bg-navy-800 text-accent md:mx-0">
                  <step.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-widest text-accent">Step {i + 1}</p>
                <h3 className="mt-1 font-heading text-2xl font-semibold text-ivory">{step.title}</h3>
                <p className="mt-3 text-ivory/75">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Statement piece */}
      <section className="bg-navy-800 px-6 py-24 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">
          <div className="flex justify-center">
            <HauntedMirror />
          </div>
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent">
              {haunted ? 'Look closer' : 'Statement pieces'}
            </p>
            <h2 className="font-heading text-4xl font-bold text-ivory">
              {haunted ? 'Something looks back' : 'A mirror changes a room'}
            </h2>
            <p className="text-lg text-ivory/75">
              {haunted
                ? 'It was here before the walls were painted. It has been waiting for someone to stop and stare.'
                : 'Mirrors double the light and the sense of space. Hoomefy suggests where one belongs, and how large it should be, based on your own photograph.'}
            </p>
          </div>
        </div>
      </section>

      {/* Reveal section: reaching this starts the takeover */}
      <section data-haunt-trigger="" className="px-6 py-28 lg:px-8">
        <div className="mx-auto max-w-4xl text-center" data-distort="">
          <h2 className="font-heading text-4xl font-bold text-ivory md:text-5xl">
            {haunted ? 'Enter, if you dare' : 'Ready to Transform Your Home?'}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-xl text-ivory/75">
            {haunted
              ? 'Your dream home has a dark side. Upload a photograph and see what it becomes.'
              : 'Upload a photo and see your room redesigned in minutes.'}
          </p>
          <Link
            to={ROUTES.studio}
            className="mt-10 inline-block rounded-md bg-amber-600 px-8 py-4 text-lg font-bold text-on-accent shadow-lg transition-all duration-200 hover:bg-amber-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-navy-900"
          >
            {haunted ? 'Open the Studio' : 'Start Designing Now'}
          </Link>
        </div>
      </section>
    </div>
  );
}
