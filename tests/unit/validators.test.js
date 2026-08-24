import { describe, expect, it } from 'vitest';
import { isEmail } from '../../src/js/validators.js';

describe('validators', () => {
  it('accepts a normal email', () => {
    expect(isEmail('thabo@abcstaffing.local')).toBe(true);
  });

  it('rejects empty values', () => {
    expect(isEmail('')).toBe(false);
  });
});
