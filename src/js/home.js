import { icon } from './icons.js';
import { countUp, reducedMotion } from './motion.js';

const WA_NUMBER = '27813864024';

function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((node) => {
    const name = node.getAttribute('data-icon');
    if (!name) return;
    const svg = icon(name);
    svg.classList.add('lp-iv');
    node.replaceWith(svg);
  });
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function dateLabel(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function startHeroClock() {
  const hour = document.getElementById('lpHour');
  const minute = document.getElementById('lpMinute');
  const second = document.getElementById('lpSecond');
  const hh = document.getElementById('lpHH');
  const date = document.getElementById('lpDate');
  if (!hour || !hh) return;

  const stepMs = reducedMotion() ? 1000 : null;
  let lastS = -1;

  function tick() {
    const now = new Date();
    const ms = now.getMilliseconds();
    const s = now.getSeconds() + ms / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    hour.style.transform = `translateX(-50%) rotate(${h * 30}deg)`;
    minute.style.transform = `translateX(-50%) rotate(${m * 6}deg)`;
    if (!reducedMotion()) {
      second.style.transform = `translateX(-50%) rotate(${s * 6}deg)`;
    } else if (now.getSeconds() !== lastS) {
      lastS = now.getSeconds();
      second.style.transform = `translateX(-50%) rotate(${lastS * 6}deg)`;
    }
    hh.textContent = [
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join(':');
    if (date) date.textContent = dateLabel(now);
    setTimeout(tick, stepMs ?? 16);
  }
  tick();
}

function startCtaClock() {
  const hour = document.getElementById('lpCtaHour');
  const minute = document.getElementById('lpCtaMinute');
  const time = document.getElementById('lpCtaTime');
  if (!hour || !time) return;

  function tick() {
    const now = new Date();
    const m = now.getMinutes() + now.getSeconds() / 60;
    const h = (now.getHours() % 12) + m / 60;
    hour.style.transform = `translateX(-50%) rotate(${h * 30}deg)`;
    minute.style.transform = `translateX(-50%) rotate(${m * 6}deg)`;
    time.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setTimeout(tick, reducedMotion() ? 1000 : 1000);
  }
  tick();
}

function initNav() {
  const nav = document.querySelector('.lp-nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const burger = document.querySelector('.lp-burger');
  const links = document.getElementById('lpNavLinks');
  if (!burger || !links) return;
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  links.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      links.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }),
  );
}

function initReveals() {
  const targets = document.querySelectorAll('.lp-reveal');
  if (!targets.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  targets.forEach((t) => io.observe(t));
}

function initCounters() {
  const nodes = document.querySelectorAll('[data-count]');
  if (!nodes.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countUp(entry.target, entry.target.dataset.count, { duration: 1.1 });
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.5 },
  );
  nodes.forEach((n) => io.observe(n));
}

function initTimeline() {
  const timeline = document.getElementById('lpTimeline');
  const progress = timeline?.querySelector('.lp-timeline-progress');
  if (!timeline || !progress) return;
  let ticking = false;
  function update() {
    ticking = false;
    const rect = timeline.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = rect.top;
    const end = rect.bottom;
    if (end <= 0 || start >= vh) return;
    const played = Math.min(1, Math.max(0, (vh - start) / (vh + rect.height - start)));
    progress.style.transform = `scaleY(${played})`;
  }
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  window.addEventListener('resize', update, { passive: true });
  update();
}

const TAB_PANELS = {
  candidate: {
    url: 'candidate — home view',
    caption: 'Candidates sign in, verify their location and clock in one tap.',
  },
  host: {
    url: 'host — live attendance',
    caption: 'Hosts see who is on shift right now and approve with a tap.',
  },
  organisation: {
    url: 'organisation — dashboard',
    caption: 'Agencies watch every site, every timesheet, every claim — live.',
  },
};

function shotFor(tab) {
  return document.querySelector(`.lp-shot[data-panel="${tab}"]`);
}

function isImageMissing(img) {
  return img && img.complete && img.naturalWidth === 0;
}

function makePlaceholder(tab) {
  const box = document.createElement('div');
  box.className = 'lp-shot-placeholder';
  box.setAttribute('role', 'img');
  box.dataset.panel = tab;
  const caption = document.createElement('span');
  caption.textContent = 'Live preview coming soon — this view captures in a moment.';
  box.appendChild(icon('monitor-play', { size: 30 }));
  box.appendChild(caption);
  return box;
}

function initTabs() {
  const tabs = document.querySelectorAll('.lp-tab');
  const stage = document.querySelector('.lp-browser-stage');
  const url = document.getElementById('lpBrowserUrl');
  const caption = document.getElementById('lpBrowserCaption');
  if (!tabs.length || !stage) return;

  let placeholder = null;
  function activate(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    const name = tab.dataset.tab;
    const meta = TAB_PANELS[name];
    if (url) url.textContent = meta.url;
    if (caption) caption.textContent = meta.caption;

    if (placeholder) {
      placeholder.remove();
      placeholder = null;
    }

    const img = shotFor(name);
    const missing = !img || isImageMissing(img);
    document.querySelectorAll('.lp-shot').forEach((s) => {
      s.classList.toggle('is-active', s === img && !missing);
    });

    if (missing) {
      placeholder = makePlaceholder(name);
      stage.appendChild(placeholder);
    }
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => activate(tab)));

  const initial = document.querySelector('.lp-tab.is-active');
  activate(initial || tabs[0]);

  window.setTimeout(() => {
    const current = document.querySelector('.lp-tab.is-active');
    const img = shotFor(current.dataset.tab);
    if (img && isImageMissing(img)) activate(current);
  }, 600);
}

function whatsAppHref(message) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

function initEnquiry() {
  const form = document.getElementById('lpEnquiryForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const get = (name) => (form.elements[name]?.value || '').trim();

    const name = get('name');
    const who = get('who');
    if (!name || !who) {
      const first = !name ? form.elements.name : form.elements.who;
      first.focus();
      return;
    }

    const lines = [
      'CLOCK-KIT ENQUIRY',
      '',
      `Name: ${name}`,
      `Company: ${get('company') || '—'}`,
      `I am a: ${who}`,
      `Workforce size: ${get('size') || '—'}`,
      `Phone/WhatsApp: ${get('phone') || '—'}`,
      `Email: ${get('email') || '—'}`,
      '',
      'Message:',
      get('message') || '(no message added)',
    ];

    window.open(whatsAppHref(lines.join('\n')), '_blank', 'noopener');
  });
}

function initHeroVideo() {
  const video = document.getElementById('lpHeroVideo');
  if (!video) return;
  if (reducedMotion()) {
    video.pause();
    return;
  }
  const play = () => video.play().catch(() => {});
  if (video.readyState >= 2) play();
  else video.addEventListener('loadedmetadata', play, { once: true });
}

function init() {
  hydrateIcons();
  startHeroClock();
  startCtaClock();
  initNav();
  initReveals();
  initCounters();
  initTimeline();
  initTabs();
  initEnquiry();
  initHeroVideo();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}