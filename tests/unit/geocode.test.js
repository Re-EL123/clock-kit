import { describe, expect, it } from 'vitest';
import { formatPhoton, isCoords } from '../../src/js/geocode.js';

describe('isCoords', () => {
  it('accepts Johannesburg', () => {
    expect(isCoords(-26.2041, 28.0473)).toBe(true);
  });

  it('rejects incomplete values', () => {
    expect(isCoords('', 28)).toBe(false);
    expect(isCoords(91, 0)).toBe(false);
  });
});

describe('formatPhoton', () => {
  it('builds a readable South African address', () => {
    const place = formatPhoton({
      geometry: { coordinates: [28.057, -26.107] },
      properties: {
        name: 'Sandton City',
        street: 'Rivonia Road',
        city: 'Sandton',
        state: 'Gauteng',
      },
    });
    expect(place.label).toContain('Sandton City');
    expect(place.label).toContain('Sandton');
    expect(place.lat).toBe(-26.107);
    expect(place.lng).toBe(28.057);
  });
});
