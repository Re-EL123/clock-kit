import { describe, expect, it } from 'vitest';
import { SOUNDS_KEY, setSoundsEnabled, soundsPreference } from '../../src/js/sound.js';

function memoryStorage(seed = {}) {
  const data = { ...seed };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: (key) => { delete data[key]; },
  };
}

describe('soundsPreference', () => {
  it('is on until the person turns sounds off', () => {
    const store = memoryStorage();
    expect(soundsPreference(store)).toBe(true);
    setSoundsEnabled(false, store);
    expect(store.getItem(SOUNDS_KEY)).toBe('off');
    expect(soundsPreference(store)).toBe(false);
    setSoundsEnabled(true, store);
    expect(soundsPreference(store)).toBe(true);
  });
});
