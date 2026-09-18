import { animate } from 'motion';

export function reducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function hasViewTransitions() {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
}

export function viewTransition(swap) {
  if (reducedMotion() || !hasViewTransitions()) return swap();
  const t = document.startViewTransition(swap);
  const settle = Promise.resolve(t.updateCallbackDone).catch(() => {});
  if (t.finished) t.finished.catch(() => {});
  return settle;
}

export function countUp(node, target, opts = {}) {
  if (!node) return null;
  const to = Number(target) || 0;
  const integer = Number.isInteger(to);
  const format = opts.format || ((n) => (integer ? String(Math.round(n)) : (Math.round(n * 100) / 100).toFixed(2)));
  if (reducedMotion()) {
    node.textContent = format(to);
    node.dataset.ckFrom = String(to);
    return node;
  }
  const from = Number(node.dataset.ckFrom || 0) || 0;
  try {
    animate(from, to, {
      duration: opts.duration ?? 0.9,
      easing: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
  } catch {
    node.textContent = format(to);
  }
  node.dataset.ckFrom = String(to);
  return node;
}

export function countUpAll(root, opts = {}) {
  if (!root) return;
  root.querySelectorAll('.stat .value').forEach((node) => countUp(node, node.textContent.trim(), opts));
}

export function reveal(node, delay = 0) {
  if (!node) return;
  if (reducedMotion()) {
    node.style.opacity = '';
    node.style.transform = '';
    return;
  }
  try {
    animate(node, { opacity: [0, 1], y: [16, 0] }, { duration: 0.42, delay, easing: [0.22, 1, 0.36, 1] });
  } catch {
    node.style.opacity = '';
    node.style.transform = '';
  }
}

export function popIn(node, delay = 0) {
  if (!node) return;
  if (reducedMotion()) {
    node.style.opacity = '';
    node.style.transform = '';
    return;
  }
  try {
    animate(node, { opacity: [0, 1], scale: [0.94, 1] }, { duration: 0.45, delay, easing: [0.22, 1, 0.36, 1] });
  } catch {
    node.style.opacity = '';
    node.style.transform = '';
  }
}

export function stagger(nodes, step = 0.06) {
  [...nodes].forEach((node, index) => reveal(node, index * step));
}
