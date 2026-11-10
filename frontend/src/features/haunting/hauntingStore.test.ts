import { describe, it, expect, beforeEach } from 'vitest';
import { useStudioStore } from '@/stores/studioStore';
import { useAuthStore } from '@/stores/authStore';
import { canAutoTakeover, useHauntingStore } from './hauntingStore';

const fresh = () => {
  useHauntingStore.setState({
    experience: 'elegant',
    horrorEnabled: true,
    takeoverSeen: false,
    candleCursor: true,
    sequence: 'idle',
    phase: 'none',
    takeoverRequest: 0,
    takeoverReason: null,
    skipRequest: 0,
    mirrorTouches: 0,
    audioEnabled: true,
    busy: false,
    busyKeys: [],
  });
};

const s = () => useHauntingStore.getState();

describe('canAutoTakeover', () => {
  const base = { horrorEnabled: true, takeoverSeen: false, experience: 'elegant', sequence: 'idle' } as const;

  it('is true only for an opted-in, first-time visitor in Elegant with nothing running', () => {
    expect(canAutoTakeover(base)).toBe(true);
    expect(canAutoTakeover({ ...base, horrorEnabled: false })).toBe(false);
    expect(canAutoTakeover({ ...base, takeoverSeen: true })).toBe(false);
    expect(canAutoTakeover({ ...base, experience: 'haunted' })).toBe(false);
    expect(canAutoTakeover({ ...base, sequence: 'running' })).toBe(false);
  });
});

describe('hauntingStore', () => {
  beforeEach(fresh);

  describe('requestTakeover', () => {
    it('accepts a scroll request once for a first-time visitor', () => {
      expect(s().requestTakeover('scroll')).toBe(true);
      expect(s().takeoverRequest).toBe(1);
      expect(s().takeoverReason).toBe('scroll');
    });

    it('rejects automatic reveals after the takeover has been seen', () => {
      s().finishTakeover();
      expect(s().requestTakeover('scroll')).toBe(false);
      expect(s().requestTakeover('mirror')).toBe(false);
      expect(s().takeoverRequest).toBe(0);
    });

    it('rejects automatic reveals once the user opted out', () => {
      s().disableHorror();
      expect(s().requestTakeover('scroll')).toBe(false);
    });

    it('rejects any request while a sequence is already running', () => {
      s().beginSequence();
      expect(s().requestTakeover('scroll')).toBe(false);
      expect(s().requestTakeover('replay')).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('beginSequence marks running at phase A; finishTakeover lands in Haunted and records it as seen', () => {
      s().beginSequence();
      expect(s().sequence).toBe('running');
      expect(s().phase).toBe('A');
      s().finishTakeover();
      expect(s().experience).toBe('haunted');
      expect(s().takeoverSeen).toBe(true);
      expect(s().sequence).toBe('idle');
      expect(s().phase).toBe('none');
    });

    it('chooseElegant returns to Elegant without re-arming the automatic reveal', () => {
      s().finishTakeover();
      s().chooseElegant();
      expect(s().experience).toBe('elegant');
      expect(s().requestTakeover('scroll')).toBe(false);
    });

    it('chooseHaunted turns horror back on', () => {
      s().disableHorror();
      s().chooseHaunted();
      expect(s().horrorEnabled).toBe(true);
      expect(s().experience).toBe('haunted');
    });

    it('disableHorror forces Elegant and leaves the sound preference alone', () => {
      s().finishTakeover();
      s().setAudioEnabled(false);
      s().disableHorror();
      expect(s().horrorEnabled).toBe(false);
      expect(s().experience).toBe('elegant');
      // The soundtrack stops because horror is off; the visitor's mute choice is not rewritten.
      expect(s().audioEnabled).toBe(false);
      s().enableHorror();
      s().setAudioEnabled(true);
      s().disableHorror();
      expect(s().audioEnabled).toBe(true);
    });
    it('plays the soundtrack by default', () => {
      expect(s().audioEnabled).toBe(true);
    });
  });

  describe('replay', () => {
    it('resets to Elegant and requests a takeover even after opt-out or seen', () => {
      s().finishTakeover();
      s().disableHorror();
      s().replay();
      expect(s().horrorEnabled).toBe(true);
      expect(s().experience).toBe('elegant');
      expect(s().takeoverSeen).toBe(false);
      expect(s().takeoverRequest).toBe(1);
      expect(s().takeoverReason).toBe('replay');
    });
  });

  describe('skip', () => {
    it('only registers while a sequence is running', () => {
      s().requestSkip();
      expect(s().skipRequest).toBe(0);
      s().beginSequence();
      s().requestSkip();
      expect(s().skipRequest).toBe(1);
    });
  });

  describe('busy tracking', () => {
    it('stays busy until every activity has finished', () => {
      s().setBusy('upload', true);
      s().setBusy('generation', true);
      expect(s().busy).toBe(true);
      s().setBusy('upload', false);
      expect(s().busy).toBe(true);
      s().setBusy('generation', false);
      expect(s().busy).toBe(false);
    });

    it('is idempotent for repeated calls', () => {
      s().setBusy('upload', true);
      s().setBusy('upload', true);
      expect(s().busyKeys).toEqual(['upload']);
      s().setBusy('upload', false);
      s().setBusy('upload', false);
      expect(s().busyKeys).toEqual([]);
    });
  });

  describe('mirror', () => {
    it('counts touches and resets them when the takeover finishes', () => {
      expect(s().touchMirror()).toBe(1);
      expect(s().touchMirror()).toBe(2);
      s().finishTakeover();
      expect(s().mirrorTouches).toBe(0);
    });
  });

  describe('isolation from application state', () => {
    it('never changes the studio or auth stores', () => {
      useStudioStore.setState({ selectedStyle: 'japandi', preferences: { customInstructions: 'keep the fireplace' } });
      useAuthStore.setState({ isAuthenticated: true });
      const studioBefore = JSON.stringify({ r: useStudioStore.getState().preferences.customInstructions, st: useStudioStore.getState().selectedStyle });
      const authBefore = useAuthStore.getState().isAuthenticated;

      s().requestTakeover('scroll');
      s().beginSequence();
      s().setPhase('C');
      s().setExperience('haunted');
      s().finishTakeover();
      s().replay();
      s().disableHorror();

      expect(JSON.stringify({ r: useStudioStore.getState().preferences.customInstructions, st: useStudioStore.getState().selectedStyle })).toBe(studioBefore);
      expect(useAuthStore.getState().isAuthenticated).toBe(authBefore);
    });
  });

  describe('candle cursor preference', () => {
    it('is on by default and can be switched off and on', () => {
      expect(s().candleCursor).toBe(true);
      s().setCandleCursor(false);
      expect(s().candleCursor).toBe(false);
      s().setCandleCursor(true);
      expect(s().candleCursor).toBe(true);
    });

    it('persists the choice', () => {
      s().setCandleCursor(false);
      const persisted = JSON.parse(window.localStorage.getItem('hoomefy_haunting') as string).state;
      expect(persisted.candleCursor).toBe(false);
    });

    it('is not changed by a takeover, replay or opt-out', () => {
      s().setCandleCursor(false);
      s().finishTakeover();
      s().replay();
      s().disableHorror();
      expect(s().candleCursor).toBe(false);
    });
  });
  describe('persistence', () => {
    it('persists only the user-facing preferences', () => {
      s().finishTakeover();
      const raw = window.localStorage.getItem('hoomefy_haunting');
      expect(raw).toBeTruthy();
      const persisted = JSON.parse(raw as string).state;
      expect(Object.keys(persisted).sort()).toEqual(['audioEnabled', 'candleCursor', 'candleDarkness', 'experience', 'horrorEnabled', 'takeoverSeen']);
      expect(persisted.experience).toBe('haunted');
    });

    it('turns the candlelight darkness on by default and remembers when it is turned off', () => {
      expect(s().candleDarkness).toBe(true);
      s().setCandleDarkness(false);
      expect(JSON.parse(window.localStorage.getItem('hoomefy_haunting') as string).state.candleDarkness).toBe(false);
    });
  });
});
