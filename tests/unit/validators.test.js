import { describe, expect, it } from 'vitest';
import { isEmail, isPassword } from '../../src/js/validators.js';

describe('validators', () => {
  it('accepts a normal email', () => {
    expect(isEmail('thabo@abcstaffing.local')).toBe(true);
  });

  it('rejects empty values', () => {
    expect(isEmail('')).toBe(false);
  });
});

describe('isPassword', () => {
  it('requires at least 8 characters', () => {
    expect(isPassword('short')).toBe(false);
    expect(isPassword('ClockKit1')).toBe(true);
  });
});
