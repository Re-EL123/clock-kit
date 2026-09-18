import { api } from '../api.js';
import { el, toast } from '../utils/dom.js';

const WIDTH = 560;
const HEIGHT = 180;

export function SignaturePad({ signaturePath = '', onSaved }) {
  let currentPath = signaturePath;
  const thumbnail = el('img', {
    alt: 'Saved signature',
    style: 'max-width:200px; max-height:64px; display:block',
  });
  const thumbWrap = el('div', { class: 'asset-preview' }, [thumbnail]);
  const canvas = el('canvas', {
    width: WIDTH,
    height: HEIGHT,
    style: 'width:100%; max-width:560px; height:180px; touch-action:none; border:1px solid gainsboro; border-radius:8px; background:#fff; cursor:crosshair; display:block',
  });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#111';
  let drawing = false;
  let last = null;

  async function loadThumb() {
    if (!currentPath) {
      thumbnail.removeAttribute('src');
      thumbnail.style.display = 'none';
      thumbWrap.classList.add('empty');
      return;
    }
    try {
      const { url } = await api('system', 'file-url', { body: { bucket: 'signatures', path: currentPath } });
      thumbnail.src = url;
      thumbnail.style.display = 'block';
      thumbWrap.classList.remove('empty');
    } catch (e) {
      toast(e.message, 'err');
    }
  }
  loadThumb();

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (WIDTH / rect.width),
      y: (clientY - rect.top) * (HEIGHT / rect.height),
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    drawing = true;
    last = pos(e);
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    e.preventDefault();
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  });
  ['pointerup', 'pointercancel'].forEach((type) =>
    canvas.addEventListener(type, () => {
      drawing = false;
      last = null;
    }),
  );

  function hasInk() {
    const data = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return true;
    }
    return false;
  }

  function clear() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  async function save() {
    if (!hasInk()) {
      toast('Draw your signature first');
      return;
    }
    let blob;
    try {
      blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Unable to export signature'))), 'image/png'),
      );
    } catch (e) {
      toast(e.message, 'err');
      return;
    }
    if (blob.size > 2097152) {
      toast('Signature too large');
      return;
    }
    try {
      const up = await api('system', 'upload-url', {
        body: { bucket: 'signatures', mimeType: 'image/png', fileName: 'signature.png' },
      });
      const res = await fetch(up.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: blob,
      });
      if (!res.ok) throw new Error('Upload failed');
      await api('system', 'save-signature', { body: { signaturePath: up.path } });
      currentPath = up.path;
      if (onSaved) onSaved(currentPath);
      toast('Signature saved');
      await loadThumb();
    } catch (e) {
      toast(e.message, 'err');
    }
  }

  return el('div', { class: 'signature-pad' }, [
    thumbWrap,
    canvas,
    el('div', { style: 'display:flex; gap:0.5rem; margin-top:0.5rem' }, [
      el('button', { class: 'btn btn-primary', type: 'button', onClick: save }, ['Save signature']),
      el('button', { class: 'btn', type: 'button', onClick: clear }, ['Clear']),
    ]),
    el('p', { class: 'muted', style: 'margin-top:0.5rem', text: 'Draw with your finger or mouse, then save. Your signature is stamped onto timesheets.' }),
  ]);
}