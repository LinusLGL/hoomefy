import { describe, it, expect, beforeEach } from 'vitest';
import { ROOM_SLOTS, type FurnitureKey, type RoomType } from './spirits';
import { activeHouse, clearedCount, isHouseBuilt, unclearedCount, useMansionStore } from './mansionStore';

const s = () => useMansionStore.getState();
const house = () => activeHouse(s());

beforeEach(() => {
  window.localStorage.clear();
  s().reset();
});

/** Register a room and return the spirits it received. */
function haunt(room: RoomType, seed = 'photo'): FurnitureKey[] {
  s().registerRoom(room, seed);
  return [...(house().rooms[room]?.spirits ?? [])];
}

describe('a fresh mansion', () => {
  it('starts with one house where every room is haunted', () => {
    expect(s().houses).toHaveLength(1);
    expect(house().name).toBe('The First House');
    expect(unclearedCount(house())).toBe(ROOM_SLOTS.length);
    expect(clearedCount(house())).toBe(0);
    expect(isHouseBuilt(house())).toBe(false);
  });
});

describe('registerRoom', () => {
  it('gives the room spirits once, and never re-rolls them', () => {
    const first = haunt('bedroom', 'photo-A');
    const again = haunt('bedroom', 'a-completely-different-photo');
    expect(first.length).toBeGreaterThan(0);
    expect(again).toEqual(first);
  });
});

describe('applyJob', () => {
  it('drives out the spirits bound to the replaced furniture and keeps the rest', () => {
    // find a seed that yields at least two spirits so partial clearing is observable
    let spirits: FurnitureKey[] = [];
    for (let i = 0; i < 60 && spirits.length < 2; i++) {
      s().reset();
      spirits = haunt('living-room', `seed-${i}`);
    }
    expect(spirits.length).toBeGreaterThanOrEqual(2);

    const out = s().applyJob('job-1', 'living-room', [spirits[0]])!;
    expect(out.driven).toEqual([spirits[0]]);
    expect(out.remaining).toEqual(spirits.slice(1));
    expect(out.roomCleared).toBe(false);
    expect(house().rooms['living-room']?.cleared).toBe(false);
    expect(house().rooms['living-room']?.spirits).toEqual(spirits.slice(1));
  });

  it('clears the room when every bound spirit is driven out', () => {
    const spirits = haunt('bedroom');
    const out = s().applyJob('job-1', 'bedroom', spirits)!;
    expect(out.roomCleared).toBe(true);
    expect(house().rooms.bedroom?.cleared).toBe(true);
    expect(clearedCount(house())).toBe(1);
  });

  it('applies a job at most once (idempotent)', () => {
    const spirits = haunt('bedroom');
    expect(s().applyJob('job-1', 'bedroom', spirits)).not.toBeNull();
    expect(s().applyJob('job-1', 'bedroom', spirits)).toBeNull();
    expect(clearedCount(house())).toBe(1);
  });

  it('does nothing for furniture that cannot exist in that room', () => {
    haunt('kitchen');
    const before = [...(house().rooms.kitchen?.spirits ?? [])];
    const out = s().applyJob('job-1', 'kitchen', ['bed'])!;
    expect(out.driven).toEqual([]);
    expect(house().rooms.kitchen?.spirits).toEqual(before);
  });

  it('replacing nothing clears nothing', () => {
    const spirits = haunt('office');
    const out = s().applyJob('job-1', 'office', [])!;
    expect(out.driven).toEqual([]);
    expect(house().rooms.office?.spirits).toEqual(spirits);
    expect(house().rooms.office?.cleared).toBe(false);
  });

  it('is safe for a room that was never registered', () => {
    const out = s().applyJob('job-1', 'bathroom', ['decor'])!;
    expect(out.driven).toEqual([]);
    expect(out.roomCleared).toBe(false);
    expect(clearedCount(house())).toBe(0);
  });

  it('only remembers the most recent jobs (bounded memory)', () => {
    for (let i = 0; i < 150; i++) s().applyJob(`job-${i}`, 'other', []);
    expect(s().appliedJobs.length).toBeLessThanOrEqual(100);
  });
});

describe('building houses', () => {
  const clearAll = () => {
    ROOM_SLOTS.forEach((room, i) => {
      const spirits = haunt(room, `all-${i}`);
      s().applyJob(`clear-${s().houses.length}-${i}`, room, spirits);
    });
  };

  it('reports the house as built only when every room is cleared', () => {
    ROOM_SLOTS.slice(0, -1).forEach((room, i) => s().applyJob(`j${i}`, room, haunt(room, `s${i}`)));
    expect(isHouseBuilt(house())).toBe(false);

    const last = ROOM_SLOTS[ROOM_SLOTS.length - 1];
    const out = s().applyJob('jlast', last, haunt(last, 'last'))!;
    expect(out.houseBuilt).toBe(true);
    expect(isHouseBuilt(house())).toBe(true);
    expect(house().builtAt).toBeTruthy();
  });

  it('refuses to start the next house until the current one is built', () => {
    s().buildNextHouse();
    expect(s().houses).toHaveLength(1);
  });

  it('starts a fresh, fully haunted house once the last one is built, and keeps the old one', () => {
    clearAll();
    expect(isHouseBuilt(house())).toBe(true);
    const firstId = house().id;

    s().buildNextHouse();

    expect(s().houses).toHaveLength(2);
    expect(house().id).not.toBe(firstId);
    expect(house().name).toBe('House 2');
    expect(unclearedCount(house())).toBe(ROOM_SLOTS.length);
    expect(isHouseBuilt(s().houses[0])).toBe(true);
  });

  it('reports houseBuilt only on the job that completed it', () => {
    clearAll();
    const out = s().applyJob('extra', 'bedroom', [])!;
    expect(out.houseBuilt).toBe(false);
  });
});

describe('persistence', () => {
  it('persists houses and applied jobs under its own key', () => {
    const spirits = haunt('bedroom');
    s().applyJob('persist-me', 'bedroom', spirits);
    const raw = JSON.parse(window.localStorage.getItem('hoomefy_mansion') as string).state;
    expect(Object.keys(raw).sort()).toEqual(['activeId', 'appliedJobs', 'houses']);
    expect(raw.appliedJobs).toContain('persist-me');
  });
});
