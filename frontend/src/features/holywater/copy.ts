/**
 * What the ghost says. One message at a time, chosen from what the visitor has done so far.
 * The text is page-agnostic: the ghost follows the visitor to every Haunted page.
 */

import { ROOMS, type RoomId } from './rooms';

/** The ghost appears this long after the Haunted page does. */
export const AVATAR_DELAY_MS = 3000;
/** A message stays up this long, unless the visitor is mid-task (a room is open, the bottle is in hand). */
export const BUBBLE_MS = 12000;

export interface GhostMessageInput {
  openRoom: RoomId | null;
  foundIn: RoomId | null;
  armed: boolean;
  scared: boolean;
}

export interface GhostMessage {
  /** Changes whenever the text changes, so the bubble can reopen. */
  key: string;
  text: string;
}

export const INTRO_MESSAGE =
  'Explore the Haunted Styles and collect the holy water, or I will scare you when the fire is gone.';

export function pickGhostMessage({ openRoom, foundIn, armed, scared }: GhostMessageInput): GhostMessage {
  if (armed) return { key: 'armed', text: 'Now touch me with it. Go on.' };
  if (foundIn) return { key: 'found', text: 'You found the holy water. Bring it to me, if you dare.' };
  if (openRoom) return { key: `clue:${openRoom}`, text: ROOMS[openRoom].clue };
  if (scared) {
    return { key: 'scared', text: 'Now you have met me. Find the holy water in the Haunted Styles and I will leave you in peace.' };
  }
  return { key: 'intro', text: INTRO_MESSAGE };
}
