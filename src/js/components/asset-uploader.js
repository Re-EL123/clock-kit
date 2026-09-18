import { api } from '../api.js';
import { el, toast } from '../utils/dom.js';

const MAX_BYTE_DISPLAY = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`);

export function AssetUploader({
  bucket,
  path = '',
  onSaved,
  onRemoved,
  accept = 'image/png',
  maxBytes = 2097152,
  hint = '',
  editable = true,
}) {
  let currentPath = path;
  const preview = el('img', { alt: 'Preview', style: 'max-width:200px; max-height:64px; display:block' });
  const previewBox = el('div', { class: 'asset-preview' }, [preview]);
  const fileInput = el('input', { type: 'file', accept, hidden: true });
  const removeBtn = el('button', {
    class: 'btn btn-danger btn-sm',
    type: 'button',
    style: 'display:none',
    text: 'Remove',
  });

  async function loadPreview() {
    if (!currentPath) {
      preview.removeAttribute('src');
      preview.style.display = 'none';
      previewBox.classList.add('empty');
      removeBtn.style.display = 'none';
      return;
    }
    try {
      const { url } = await api('system', 'file-url', { body: { bucket, path: currentPath } });
      preview.src = url;
      preview.style.display = 'block';
      previewBox.classList.remove('empty');
      removeBtn.style.display = editable ? 'inline-block' : 'none';
    } catch (e) {
      toast(e.message, 'err');
    }
  }
  loadPreview();

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (file.size > maxBytes) {
      toast(`File too large. Maximum ${MAX_BYTE_DISPLAY(maxBytes)}.`);
      return;
    }
    const allowed = accept.split(',').map((m) => m.trim().toLowerCase());
    if (!allowed.includes(file.type)) {
      toast(`Only ${accept} files are allowed`);
      return;
    }
    try {
      const up = await api('system', 'upload-url', {
        body: { bucket, mimeType: file.type, fileName: file.name },
      });
      const res = await fetch(up.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed');
      const nextPath = onSaved ? await onSaved(up.path) : up.path;
      currentPath = nextPath || up.path;
      toast('Saved');
      await loadPreview();
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      fileInput.value = '';
    }
  });

  removeBtn.addEventListener('click', async () => {
    try {
      if (onRemoved) await onRemoved();
      currentPath = '';
      toast('Removed');
      await loadPreview();
    } catch (e) {
      toast(e.message, 'err');
    }
  });

  return el('div', { class: 'asset-uploader' }, [
    hint ? el('p', { class: 'muted', style: 'margin-bottom:0.5rem', text: hint }) : null,
    previewBox,
    editable
      ? el('div', { style: 'display:flex; gap:0.5rem; margin-top:0.5rem; flex-wrap:wrap' }, [
          el('button', { class: 'btn', type: 'button', onClick: () => fileInput.click() }, ['Choose file']),
          removeBtn,
          fileInput,
        ])
      : null,
  ]);
}