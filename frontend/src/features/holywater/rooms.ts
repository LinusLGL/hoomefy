/**
 * The three Haunted rooms shown on the home page, and the holy water hidden in each.
 *
 * `bottle` is the centre of the hidden bottle as a percentage of the full-size painting (1672x941),
 * so it stays on the same spot at any display size. The spots were chosen by looking at each
 * painting: a clear patch of table next to a landmark that the clue names.
 */

export type RoomId = 'drawing-room' | 'library' | 'grand-ballroom';

export interface Room {
  id: RoomId;
  name: string;
  /** Full-size painting, shown in the viewer. */
  image: string;
  /** Smaller copy for the card on the home page. */
  thumb: string;
  alt: string;
  /** Centre of the hidden holy water, in percent of the painting. */
  bottle: { x: number; y: number };
  /** The ghost's hint while this room is open. */
  clue: string;
}

export const ROOM_IDS: readonly RoomId[] = ['drawing-room', 'library', 'grand-ballroom'];

export const ROOMS: Record<RoomId, Room> = {
  'drawing-room': {
    id: 'drawing-room',
    name: 'The Drawing Room',
    image: '/images/haunted/rooms/drawing-room.webp',
    thumb: '/images/haunted/rooms/drawing-room-thumb.webp',
    alt: 'A ruined drawing room under cobwebs: a velvet sofa, a pale figure at the window, a fire in the hearth and a tea table with a framed portrait.',
    bottle: { x: 70.6, y: 68 },
    clue: 'Tea was poured here and never finished. Look at the little table, to the right of the framed portrait.',
  },
  library: {
    id: 'library',
    name: 'The Library',
    image: '/images/haunted/rooms/library.webp',
    thumb: '/images/haunted/rooms/library-thumb.webp',
    alt: 'A dark library of leather books with a bust in an alcove, candles, a skull, and an open book whose pages turn by themselves.',
    bottle: { x: 71.9, y: 82 },
    clue: 'The scholar left more than a book open. Look on the desk, between the inkwell and the great tome.',
  },
  'grand-ballroom': {
    id: 'grand-ballroom',
    name: 'The Grand Ballroom',
    image: '/images/haunted/rooms/grand-ballroom.webp',
    thumb: '/images/haunted/rooms/grand-ballroom-thumb.webp',
    alt: 'A grand ballroom lit by a crystal chandelier, with a marble staircase, a red carpet, a chequered floor and a masquerade mask on a table.',
    bottle: { x: 22.7, y: 79.4 },
    clue: 'Someone left a mask beside the wine. Look to the right of the decanter, on the dark cloth.',
  },
};

export const isRoomId = (value: unknown): value is RoomId =>
  typeof value === 'string' && (ROOM_IDS as readonly string[]).includes(value);
