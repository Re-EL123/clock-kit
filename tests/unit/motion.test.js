import { describe, expect, it, afterEach, vi } from 'vitest';
import { countUp, countUpAll, hasViewTransitions, reducedMotion, viewTransition } from '../../src/js/motion.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reducedMotion', () => {
  it('is false in a DOM-less environment', () => {
    expect(reducedMotion()).toBe(false);
  });

  it('honours prefers-reduced-motion', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    expect(reducedMotion()).toBe(true);
  });
});

describe('countUp', () => {
  it('sets the final value immediately under reduced motion', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    const node = { textContent: '0', dataset: {} };
    countUp(node, 12, {});
    expect(node.textContent).toBe('12');
    expect(node.dataset.ckFrom).toBe('12');
  });

  it('formats decimals when the target is not an integer', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    const node = { textContent: '0', dataset: {} };
    countUp(node, 12.5, {});
    expect(node.textContent).toBe('12.50');
  });
});

describe('countUpAll', () => {
  it('animates every stat value under a root', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    const one = { textContent: '3', dataset: {} };
    const two = { textContent: '7', dataset: {} };
    const root = { querySelectorAll: () => [one, two] };
    countUpAll(root);
    expect(one.textContent).toBe('3');
    expect(two.textContent).toBe('7');
  });
});

describe('viewTransition', () => {
  it('runs the swap directly when the API is unavailable', async () => {
    let called = 0;
    const result = viewTransition(() => {
      called += 1;
    });
    expect(called).toBe(1);
    await result;
    expect(hasViewTransitions()).toBe(false);
  });

  it('wraps the swap in startViewTransition when supported', async () => {
    let swapped = 0;
    let used = 0;
    vi.stubGlobal('document', {
      startViewTransition: (cb) => {
        used += 1;
        cb();
        return { updateCallbackDone: Promise.resolve(), finished: Promise.resolve() };
      },
    });
    await viewTransition(() => {
      swapped += 1;
    });
    expect(used).toBe(1);
    expect(swapped).toBe(1);
  });

  it('skips the transition under reduced motion', async () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    let used = 0;
    let swapped = 0;
    vi.stubGlobal('document', {
      startViewTransition: () => {
        used += 1;
        return { updateCallbackDone: Promise.resolve(), finished: Promise.resolve() };
      },
    });
    await viewTransition(() => {
      swapped += 1;
    });
    expect(used).toBe(0);
    expect(swapped).toBe(1);
  });
});