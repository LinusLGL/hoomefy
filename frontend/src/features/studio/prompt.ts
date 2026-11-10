/**
 * Builds the instruction sent to the image-edit model.
 *
 * The model edits the user's own photograph, so the prompt says what to change (furniture, materials,
 * colours, decor, light) and, just as firmly, what must stay (the architecture and the camera).
 *
 * The owner's own words ("Whisper your wishes") come first and are marked as the priority: the chosen style
 * fills in everything the request does not mention, and the "keep the layout" rules give way to anything the
 * request asks to change. Without that, a wish such as "add a window" is overruled by the rules that follow it.
 */
import type { DesignStyle } from '@/types';
import { STYLES } from './styles';

export const MAX_FREE_TEXT = 500;

export interface PromptInput {
  style: DesignStyle;
  /** The user's own style text. Required for the custom theme, ignored otherwise. */
  customStyle?: string;
  /** 0 = subtle, 1 = dramatic. */
  intensity?: number;
  /** The owner's own requests, such as "add more plants". They take priority over the style. */
  instructions?: string;
}

const PRESERVE =
  'Keep the exact room layout and architecture: the room shape and dimensions, wall, floor and ceiling positions, the size and position of every window and door, the camera angle and perspective, and the position and size of the main furniture. Change only the furniture design, materials, colours, textiles, decor and lighting.';

const PRESERVE_UNLESS_ASKED =
  'Otherwise keep the room layout and architecture: the room shape and dimensions, wall, floor and ceiling positions, the size and position of every window and door, the camera angle and perspective, and the position and size of the main furniture. Change those only where the request above asks for it.';

const QUALITY = 'Photorealistic interior photograph, natural proportions, sharp detail, no text, no watermark, no people.';

/** Collapses whitespace and removes control characters and anything past the length limit. */
export function cleanText(value: string | undefined, max = MAX_FREE_TEXT): string {
  if (!value) return '';
  return value
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

function intensityText(intensity: number): string {
  if (intensity < 0.35) {
    return 'Make a subtle makeover: keep most existing furniture where it is and mainly update colours, textiles, decor and lighting.';
  }
  if (intensity < 0.7) {
    return 'Make a clear makeover: replace the furniture and decor with pieces in this style, in the same positions.';
  }
  return 'Make a complete, dramatic redesign of the furniture, materials, colours, decor and lighting in this style, with each piece in the same position as the original.';
}

/** True when the style can be turned into a prompt (the custom theme needs the user's words). */
export function hasStyleText(style: DesignStyle, customStyle?: string): boolean {
  return style !== 'custom' || cleanText(customStyle).length >= 3;
}

export function buildEditPrompt(input: PromptInput): string {
  const styleText = input.style === 'custom' ? cleanText(input.customStyle) : STYLES[input.style].prompt;
  const intensity = intensityText(Math.min(1, Math.max(0, input.intensity ?? 0.7)));

  // Straight quotes would end the quotation early, and a closing full stop would double up with ours.
  const wishes = cleanText(input.instructions)
    .replace(/["\u201c\u201d]/g, "'")
    .replace(/[.!\s]+$/, '');

  if (!wishes) {
    return [`Edit this photograph of a room. Restyle the interior in this look: ${styleText}.`, intensity, PRESERVE, QUALITY].join(' ');
  }

  return [
    'Edit this photograph of a room.',
    `The owner's request comes first and must be clearly visible in the result: "${wishes}".`,
    `For everything the request does not mention, restyle the interior in this look: ${styleText}.`,
    intensity,
    PRESERVE_UNLESS_ASKED,
    QUALITY,
  ].join(' ');
}
