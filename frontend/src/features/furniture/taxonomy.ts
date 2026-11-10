/**
 * The kinds of furniture and decor the studio can name, find in a picture and shop for.
 *
 * `detectLabel` is the phrase given to the on-device detector. `noun` is the word used when searching
 * shops. Prices are rough US-dollar ranges per quality tier; they are estimates, shown as such, and real
 * prices come from the product search.
 */

import type { PriceTier } from '@/features/studio/styles';

export type FurnitureKindId =
  | 'sofa'
  | 'armchair'
  | 'chair'
  | 'coffee-table'
  | 'side-table'
  | 'dining-table'
  | 'bed'
  | 'nightstand'
  | 'dresser'
  | 'bookshelf'
  | 'tv-stand'
  | 'desk'
  | 'rug'
  | 'floor-lamp'
  | 'table-lamp'
  | 'chandelier'
  | 'pendant-light'
  | 'curtains'
  | 'mirror'
  | 'wall-art'
  | 'plant'
  | 'cabinet'
  | 'ottoman'
  | 'vase';

export type PriceRange = [min: number, max: number];

export interface FurnitureKind {
  id: FurnitureKindId;
  label: string;
  detectLabel: string;
  noun: string;
  price: Record<PriceTier, PriceRange>;
}

const kind = (
  id: FurnitureKindId,
  label: string,
  detectLabel: string,
  noun: string,
  budget: PriceRange,
  mid: PriceRange,
  premium: PriceRange
): FurnitureKind => ({ id, label, detectLabel, noun, price: { budget, mid, premium } });

export const FURNITURE: Record<FurnitureKindId, FurnitureKind> = {
  sofa: kind('sofa', 'Sofa', 'sofa', 'sofa', [450, 900], [900, 1800], [2000, 5000]),
  armchair: kind('armchair', 'Armchair', 'armchair', 'armchair', [150, 350], [350, 800], [900, 2200]),
  chair: kind('chair', 'Chair', 'chair', 'chair', [40, 90], [90, 220], [250, 600]),
  'coffee-table': kind('coffee-table', 'Coffee table', 'coffee table', 'coffee table', [80, 200], [200, 500], [600, 1500]),
  'side-table': kind('side-table', 'Side table', 'side table', 'side table', [40, 90], [90, 220], [250, 700]),
  'dining-table': kind('dining-table', 'Dining table', 'dining table', 'dining table', [200, 450], [450, 1100], [1300, 3500]),
  bed: kind('bed', 'Bed', 'bed', 'bed frame', [250, 500], [500, 1100], [1300, 3500]),
  nightstand: kind('nightstand', 'Nightstand', 'nightstand', 'nightstand', [50, 120], [120, 260], [300, 800]),
  dresser: kind('dresser', 'Dresser', 'dresser', 'dresser', [200, 400], [400, 900], [1000, 2800]),
  bookshelf: kind('bookshelf', 'Bookshelf', 'bookshelf', 'bookshelf', [80, 180], [180, 450], [500, 1500]),
  'tv-stand': kind('tv-stand', 'TV stand', 'tv stand', 'tv stand', [100, 250], [250, 550], [600, 1500]),
  desk: kind('desk', 'Desk', 'desk', 'desk', [100, 250], [250, 550], [600, 1500]),
  rug: kind('rug', 'Rug', 'rug', 'area rug', [80, 200], [200, 600], [700, 2500]),
  'floor-lamp': kind('floor-lamp', 'Floor lamp', 'floor lamp', 'floor lamp', [30, 70], [70, 200], [220, 700]),
  'table-lamp': kind('table-lamp', 'Table lamp', 'table lamp', 'table lamp', [25, 60], [60, 150], [180, 500]),
  chandelier: kind('chandelier', 'Chandelier', 'chandelier', 'chandelier', [80, 200], [200, 600], [700, 3000]),
  'pendant-light': kind('pendant-light', 'Pendant light', 'pendant light', 'pendant light', [40, 100], [100, 300], [350, 1200]),
  curtains: kind('curtains', 'Curtains', 'curtains', 'curtains', [30, 70], [70, 180], [200, 600]),
  mirror: kind('mirror', 'Mirror', 'mirror', 'wall mirror', [40, 100], [100, 300], [350, 1200]),
  'wall-art': kind('wall-art', 'Wall art', 'framed painting', 'framed wall art', [20, 60], [60, 200], [250, 1000]),
  plant: kind('plant', 'Plant', 'potted plant', 'indoor plant in pot', [15, 40], [40, 90], [100, 250]),
  cabinet: kind('cabinet', 'Cabinet', 'cabinet', 'cabinet', [120, 260], [260, 600], [700, 1800]),
  ottoman: kind('ottoman', 'Ottoman', 'ottoman', 'ottoman', [40, 90], [90, 220], [250, 700]),
  vase: kind('vase', 'Vase', 'vase', 'vase', [10, 30], [30, 80], [90, 300]),
};

export const FURNITURE_IDS = Object.keys(FURNITURE) as FurnitureKindId[];

export const isFurnitureKind = (value: unknown): value is FurnitureKindId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(FURNITURE, value);

export const midpoint = ([min, max]: PriceRange): number => Math.round((min + max) / 2);
