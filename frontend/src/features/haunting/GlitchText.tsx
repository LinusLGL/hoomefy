/**
 * GlitchText
 *
 * Renders text as words made of per-character spans so the takeover can scatter,
 * displace and re-form individual letters. The accessible name is a single
 * visually hidden span, so screen readers read the sentence once and ignore the
 * decorative character spans.
 *
 * The element carries `data-glitch` so the takeover controller can find it.
 * Set `active` to run the always-on CSS RGB-split layers (used for the ghostly
 * logo and the "YOU SHOULDN'T BE HERE." message).
 *
 * A "\n" in `text` is a deliberate line break (used where the design fixes where a line ends).
 */

import { createElement, Fragment, type ElementType, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface GlitchTextProps {
  text: string;
  as?: ElementType;
  className?: string;
  active?: boolean;
  /** Extra content rendered after the characters (e.g. a trailing icon). */
  children?: ReactNode;
  /** Opt out of takeover targeting. */
  untargeted?: boolean;
  /** Extra attributes for the root element, e.g. { 'data-hero-heading': '' }. */
  extra?: Record<string, string>;
  /** A word, or a run of whole words, to render in the emphasised (italic, crimson) style. */
  emphasize?: string;
}

/** Indexes (into `words`) of the first run of words that spells out `phrase`. */
function emphasisedIndexes(words: string[], phrase: string | undefined): Set<number> {
  const found = new Set<number>();
  if (!phrase) return found;
  const target = phrase.split(' ');
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((w, j) => words[i + j] === w)) {
      target.forEach((_, j) => found.add(i + j));
      break;
    }
  }
  return found;
}

export function GlitchText({ text, as = 'span', className, active = false, children, untargeted = false, extra, emphasize }: GlitchTextProps) {
  const plain = text.replace(/\n/g, ' ');
  const lines = text.split('\n').map((line) => line.split(' '));
  const flat = lines.flat();
  const emphasised = emphasisedIndexes(flat, emphasize);
  let index = -1;

  const body = (
    <>
      <span className="sr-only">{plain}</span>
      <span aria-hidden="true" className="hf-glitch__chars">
        {lines.map((words, li) => (
          <Fragment key={li}>
            {/* The space keeps the words apart where the break is switched off (narrow screens). */}
            {li > 0 && (
              <>
                {' '}
                <br className="hf-br" />
              </>
            )}
            {words.map((word, wi) => {
              index += 1;
              return (
                <Fragment key={`${word}-${wi}`}>
                  <span className={cn('hf-word', emphasised.has(index) && 'hf-emphasis')}>
                    {Array.from(word).map((ch, ci) => (
                      <span key={ci} className="hf-ch">
                        {ch}
                      </span>
                    ))}
                  </span>
                  {/* The separating space must live outside the inline-block word, where it would collapse. */}
                  {wi < words.length - 1 ? ' ' : null}
                </Fragment>
              );
            })}
          </Fragment>
        ))}
      </span>
      {children}
    </>
  );

  return createElement(
    as,
    {
      className: cn('hf-glitch', active && 'hf-glitch--active', className),
      'data-text': plain,
      'data-active': active ? 'true' : undefined,
      ...(untargeted ? {} : { 'data-glitch': '' }),
      ...extra,
    },
    body
  );
}
