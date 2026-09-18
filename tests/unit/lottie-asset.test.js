import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const asset = JSON.parse(readFileSync(join(__dirname, '../../public/lottie/clock-check.json'), 'utf8'));

describe('clock-check Lottie asset', () => {
  it('is a valid minimal lottie document', () => {
    expect(asset.v).toMatch(/^\d+\.\d+\.\d+$/);
    expect(asset.w).toBeGreaterThan(0);
    expect(asset.h).toBeGreaterThan(0);
    expect(Array.isArray(asset.layers)).toBe(true);
    expect(asset.layers.length).toBeGreaterThan(0);
  });

  it('contains two drawn shape layers', () => {
    expect(asset.layers.filter((layer) => layer.ty === 4)).toHaveLength(2);
    expect(asset.layers.every((layer) => layer.shapes?.some((shape) => shape.ty === 'gr'))).toBe(true);
  });
});