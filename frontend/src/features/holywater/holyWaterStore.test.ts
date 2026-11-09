import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HOLY_WATER_STORAGE_KEY, useHolyWaterStore } from './holyWaterStore';
import { ROOMS, ROOM_IDS, isRoomId } from './rooms';
import { INTRO_MESSAGE, pickGhostMessage } from './copy';

const fresh = () => {
  sessionStorage.clear();
  useHolyWaterStore.setState({ foundIn: null, scared: false, cured: false, openRoom: null, armed: false, video: 'none' });
};
const s = () => useHolyWaterStore.getState();

beforeEach(fresh);
afterEach(fresh);

describe('resetAll', () => {
  it('forgets the holy water, the scare and the cure, and counts the reset', () => {
    useHolyWaterStore.setState({ foundIn: 'library', scared: true, cured: true, armed: true, openRoom: 'library' });
    const before = s().resetCount;
    s().resetAll();
    expect(s()).toMatchObject({ foundIn: null, scared: false, cured: false, armed: false, openRoom: null, video: 'none' });
    expect(s().resetCount).toBe(before + 1);
    expect(JSON.parse(sessionStorage.getItem(HOLY_WATER_STORAGE_KEY) ?? '{}').state).toMatchObject({ foundIn: null, cured: false });
  });
});
describe('rooms', () => {
  it('has three rooms, each with its own hidden holy water inside the painting', () => {
    expect([...ROOM_IDS]).toEqual(['drawing-room', 'library', 'grand-ballroom']);
    for (const id of ROOM_IDS) {
      const r = ROOMS[id];
      expect(r.id).toBe(id);
      expect(r.image).toMatch(/\.webp$/);
      expect(r.thumb).toMatch(/-thumb\.webp$/);
      expect(r.bottle.x).toBeGreaterThan(2);
      expect(r.bottle.x).toBeLessThan(98);
      expect(r.bottle.y).toBeGreaterThan(2);
      expect(r.bottle.y).toBeLessThan(98);
      expect(r.clue.length).toBeGreaterThan(20);
    }
    // No two rooms hide the bottle in the same place.
    expect(new Set(ROOM_IDS.map((id) => `${ROOMS[id].bottle.x},${ROOMS[id].bottle.y}`)).size).toBe(3);
  });

  it('recognises only real room ids', () => {
    expect(isRoomId('library')).toBe(true);
    expect(isRoomId('attic')).toBe(false);
    expect(isRoomId(undefined)).toBe(false);
  });
});

describe('collecting the holy water', () => {
  it('one is enough: the first collected counts, later ones do not', () => {
    expect(s().collect('library')).toBe(true);
    expect(s().foundIn).toBe('library');
    expect(s().collect('drawing-room')).toBe(false);
    expect(s().foundIn).toBe('library');
  });

  it('cannot be collected after the ghost was dispersed', () => {
    useHolyWaterStore.setState({ cured: true });
    expect(s().collect('library')).toBe(false);
    expect(s().foundIn).toBeNull();
  });

  it('can only be picked up once there is something to pick up', () => {
    s().setArmed(true);
    expect(s().armed).toBe(false);
    s().collect('library');
    s().setArmed(true);
    expect(s().armed).toBe(true);
    s().setArmed(false);
    expect(s().armed).toBe(false);
  });
});

describe('the jumpscare', () => {
  it('plays once: it is marked spent the moment it starts', () => {
    s().startScare();
    expect(s().video).toBe('scare');
    expect(s().scared).toBe(true);

    s().finishVideo();
    expect(s().video).toBe('none');
    s().startScare();
    expect(s().video).toBe('none');
  });

  it('closes an open room and puts the bottle down', () => {
    s().collect('library');
    s().openRoomViewer('library');
    s().setArmed(true);
    s().startScare();
    expect(s().openRoom).toBeNull();
    expect(s().armed).toBe(false);
  });
});

describe('the cure', () => {
  it('needs a collected holy water', () => {
    expect(s().startCure()).toBe(false);
    expect(s().video).toBe('none');
  });

  it('plays the effect, and when it ends the ghost is gone for the session', () => {
    s().collect('grand-ballroom');
    expect(s().startCure()).toBe(true);
    expect(s().video).toBe('cure');
    expect(s().startCure()).toBe(false); // not twice

    s().finishVideo();
    expect(s().video).toBe('none');
    expect(s().cured).toBe(true);
  });
});

describe('what is remembered', () => {
  it('keeps the holy water, the scare and the cure in the tab session, not in local storage', () => {
    s().collect('library');
    s().startScare();
    s().finishVideo();
    s().openRoomViewer('library');

    const stored = JSON.parse(sessionStorage.getItem(HOLY_WATER_STORAGE_KEY) ?? '{}');
    expect(stored.state).toEqual({ foundIn: 'library', scared: true, cured: false });
    expect(localStorage.getItem(HOLY_WATER_STORAGE_KEY)).toBeNull();
  });

  it('ignores a stored room that does not exist', async () => {
    sessionStorage.setItem(HOLY_WATER_STORAGE_KEY, JSON.stringify({ state: { foundIn: 'attic', scared: true }, version: 0 }));
    await useHolyWaterStore.persist.rehydrate();
    expect(s().foundIn).toBeNull();
    expect(s().scared).toBe(true);
    expect(s().cured).toBe(false);
  });

  it('forgets transient state when the layer goes away', () => {
    s().collect('library');
    s().openRoomViewer('library');
    s().setArmed(true);
    s().resetTransient();
    expect(s().openRoom).toBeNull();
    expect(s().armed).toBe(false);
    expect(s().foundIn).toBe('library'); // what was found stays found
  });
});

describe('the ghost speaks', () => {
  const base = { openRoom: null, foundIn: null, armed: false, scared: false } as const;

  it('starts with the invitation to explore and collect holy water', () => {
    const m = pickGhostMessage(base);
    expect(m.text).toBe(INTRO_MESSAGE);
    expect(m.text).toMatch(/Haunted Styles/);
    expect(m.text).toMatch(/holy water/);
    expect(m.text).toMatch(/fire is gone/);
  });

  it('gives the clue of the room that is open', () => {
    for (const id of ROOM_IDS) {
      expect(pickGhostMessage({ ...base, openRoom: id })).toEqual({ key: `clue:${id}`, text: ROOMS[id].clue });
    }
  });

  it('tells the visitor to bring the holy water once found, and to touch him with it once picked up', () => {
    expect(pickGhostMessage({ ...base, foundIn: 'library' }).key).toBe('found');
    expect(pickGhostMessage({ ...base, foundIn: 'library', openRoom: 'library' }).key).toBe('found');
    expect(pickGhostMessage({ ...base, foundIn: 'library', armed: true }).key).toBe('armed');
  });

  it('remembers that the scare has happened', () => {
    expect(pickGhostMessage({ ...base, scared: true }).key).toBe('scared');
  });
});
