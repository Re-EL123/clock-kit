import { el } from '../utils/dom.js';
import { icon } from '../icons.js';
import { withBase } from '../config.js';
import { reducedMotion } from '../motion.js';

let lottiePromise;

async function lottieWeb() {
  if (!lottiePromise) lottiePromise = (await import('lottie-web')).default;
  return lottiePromise;
}

export async function SuccessStamp({ src = withBase('lottie/clock-check.json'), label = 'Success' } = {}) {
  const host = el('div', { class: 'success-stamp', role: 'img', 'aria-label': label });
  const fallback = () => host.replaceChildren(icon('check', { size: 56 }));
  if (reducedMotion()) {
    fallback();
    return host;
  }
  try {
    const lottie = await lottieWeb();
    const res = await fetch(src);
    if (!res.ok) throw new Error('Animation asset unavailable');
    const data = await res.json();
    lottie.loadAnimation({
      container: host,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      animationData: data,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    });
  } catch {
    fallback();
  }
  return host;
}