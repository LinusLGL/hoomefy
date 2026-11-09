/**
 * The design themes offered in the studio.
 *
 * Each theme carries the wording that goes into the image-edit prompt (`prompt`), so choosing a
 * theme changes what the model is asked to do and not just what the card says. `hints` feed the
 * furniture suggestions and price estimates.
 */

import type { DesignStyle, RoomType } from '@/types';

export type PriceTier = 'budget' | 'mid' | 'premium';

export interface StyleDefinition {
  id: DesignStyle;
  name: string;
  tagline: string;
  /** Three colours that sum the theme up, used on the card. */
  swatches: [string, string, string];
  /** CSS background for the card artwork. */
  gradient: string;
  /** Wording for the image-edit prompt. Empty for the custom theme, which uses the user's text. */
  prompt: string;
  /** Words used to find similar products. */
  searchWords: string;
  tier: PriceTier;
}

export const STYLE_ORDER: DesignStyle[] = ['scandinavian', 'japandi', 'modern-luxury', 'minimalist', 'halloween', 'custom'];

export const STYLES: Record<DesignStyle, StyleDefinition> = {
  scandinavian: {
    id: 'scandinavian',
    name: 'Scandinavian',
    tagline: 'Light, cozy and natural',
    swatches: ['#F4EFE6', '#D9B98A', '#8FA38B'],
    gradient: 'linear-gradient(135deg, #F8F4EC 0%, #E8D9BF 55%, #B7C4B0 100%)',
    prompt:
      'Scandinavian style: bright white walls, light oak and birch furniture with slim tapered legs, soft wool and linen textiles, a chunky knit throw, simple matte-white lighting, a few green plants, uncluttered and cozy, soft natural daylight',
    searchWords: 'scandinavian light oak',
    tier: 'mid',
  },
  japandi: {
    id: 'japandi',
    name: 'Japandi',
    tagline: 'Japanese calm, Nordic warmth',
    swatches: ['#E5DCCB', '#A98B63', '#4E4A41'],
    gradient: 'linear-gradient(135deg, #EFE7D8 0%, #C7B08B 55%, #6C6455 100%)',
    prompt:
      'Japandi style: a calm blend of Japanese minimalism and Scandinavian warmth, warm oak and walnut furniture, low-profile pieces, natural linen and paper textures, muted earthy neutrals such as sand, clay and soft greige, a paper lantern or rattan pendant light, simple ceramics, very little decor, soft indirect lighting',
    searchWords: 'japandi natural wood',
    tier: 'mid',
  },
  'modern-luxury': {
    id: 'modern-luxury',
    name: 'Modern Luxury',
    tagline: 'Velvet, marble and brass',
    swatches: ['#1F2A44', '#C9A961', '#EDE6D8'],
    gradient: 'linear-gradient(135deg, #1B2540 0%, #4A3F5E 50%, #C9A961 100%)',
    prompt:
      'modern luxury style: a sophisticated upscale interior with velvet and boucle upholstery, marble and brushed brass accents, a sculptural statement light fixture, rich layered textures, a deep neutral palette with jewel-tone accents, large framed art, elegant symmetrical styling, warm ambient lighting',
    searchWords: 'luxury velvet brass marble',
    tier: 'premium',
  },
  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    tagline: 'Clean lines, nothing extra',
    swatches: ['#FFFFFF', '#D5D8DC', '#2B2E33'],
    gradient: 'linear-gradient(135deg, #FFFFFF 0%, #E4E7EA 60%, #B4BAC1 100%)',
    prompt:
      'minimalist style: clean lines and very few pieces, a white and light-grey palette with one subtle accent colour, matte surfaces, simple geometric furniture, bare uncluttered surfaces, no ornament, bright even lighting',
    searchWords: 'minimalist modern simple',
    tier: 'budget',
  },
  halloween: {
    id: 'halloween',
    name: 'Halloween',
    tagline: 'Tastefully spooky',
    swatches: ['#1A1024', '#E8731A', '#6B3FA0'],
    gradient: 'linear-gradient(135deg, #140B1E 0%, #4A2470 55%, #E8731A 100%)',
    prompt:
      "Halloween style: a stylish, tasteful spooky interior with a dark moody palette of black, deep purple and burnt orange, carved pumpkins and jack-o'-lanterns, flickering candles and lanterns, subtle cobweb and bat accents, a gothic candelabra, velvet drapes, vintage portraits, dim warm candlelight with a faint mist",
    searchWords: 'gothic halloween dark velvet',
    tier: 'mid',
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    tagline: 'Describe it in your own words',
    swatches: ['#C9A961', '#8E8A82', '#2B2E33'],
    gradient: 'linear-gradient(135deg, #2B2E33 0%, #6B655C 55%, #C9A961 100%)',
    prompt: '',
    searchWords: '',
    tier: 'mid',
  },
};

export const isDesignStyle = (value: unknown): value is DesignStyle =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(STYLES, value);

/** How the room is named inside the prompt. */
export const ROOM_WORDS: Record<RoomType, string> = {
  'living-room': 'living room',
  bedroom: 'bedroom',
  kitchen: 'kitchen',
  'dining-room': 'dining room',
  office: 'home office',
  bathroom: 'bathroom',
  other: 'room',
};
