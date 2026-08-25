import { describe, expect, it } from 'vitest';
import { isCoords } from '../../src/js/geocode.js';

describe('isCoords', () => {
  it('accepts Johannesburg', () => {
    expect(isCoords(-26.2041, 28.0473)).toBe(true);
  });

  it('rejects incomplete values', () => {
    expect(isCoords('', 28)).toBe(false);
    expect(isCoords(91, 0)).toBe(false);
  });
});
