/**
 * Builds the instruction sent to the image-edit model.
 *
 * The model edits the user's own photograph, so the prompt says what to change (furniture, materials,
 * colours, decor, light) and, just as firmly, what must stay (the architecture and the camera).
 */

import type { ColorPalette, DesignStyle, RoomType } from '@/types';
import { ROOM_WORDS, STYLES } from './styles';

export const MAX_FREE_TEXT = 500;

export interface PromptInput {
  roomType: RoomType | null;
  style: DesignStyle;
  /** The user's own style text. Required for the custom theme, ignored otherwise. */
  customStyle?: string;
  palette?: ColorPalette;
  /** 0 = subtle, 1 = dramatic. */
  intensity?: number;
  /** Extra requests from the user, such as "add more plants". */
  instructions?: string;
}

const PALETTES: Record<ColorPalette, string> = {
  warm: 'Use a warm colour palette of cream, terracotta, amber and honey-coloured wood.',
  cool: 'Use a cool colour palette of soft blue, sage, grey and silver.',
  neutral: 'Use a neutral colour palette of white, beige, stone and soft grey.',
  bold: 'Use a bold colour palette with saturated accent colours against a calm base.',
};

const PRESERVE =
  'Keep the exact room layout and architecture: the room shape and dimensions, wall, floor and ceiling positions, the size and position of every window and door, the camera angle and perspective, and the position and size of the main furniture. Change only the furniture design, materials, colours, textiles, decor and lighting.';

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
  const room = input.roomType ? ROOM_WORDS[input.roomType] : 'room';
  const styleText = input.style === 'custom' ? cleanText(input.customStyle) : STYLES[input.style].prompt;
  const parts: string[] = [`Edit this photograph of a ${room}. Restyle the interior in this look: ${styleText}.`];

  if (input.palette) parts.push(PALETTES[input.palette]);
  parts.push(intensityText(Math.min(1, Math.max(0, input.intensity ?? 0.7))));

  const extra = cleanText(input.instructions);
  if (extra) parts.push(`Also: ${extra}.`);

  parts.push(PRESERVE, QUALITY);
  return parts.join(' ');
}
