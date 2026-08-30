import { animate } from 'motion';

export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
