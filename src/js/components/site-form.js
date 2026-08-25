import { el, toast } from '../utils/dom.js';
import { AddressPicker } from './address-picker.js';
import { fieldError, clearFieldError, requireValue, shake } from '../forms.js';
import { isCoords } from '../geocode.js';
import { dismissModal } from './modal.js';

function field(label, input) {
  return el('div', { class: 'field' }, [el('span', { text: label }), input]);
}

export function SiteForm({ hosts = [], site = null, submitLabel = 'Save site', onSubmit }) {
  const hostSel = el(
    'select',
    { class: 'input' },
    [
      el('option', { value: '', text: hosts.length ? 'Select a host' : 'Create a host first' }),
      ...(hosts || []).map((h) => el('option', { value: h.id, text: h.name })),
    ],
  );
  if (site?.host_id) hostSel.value = site.host_id;
  if (site?.host_id && !(hosts || []).some((h) => h.id === site.host_id)) {
    hostSel.append(el('option', { value: site.host_id, text: site.hosts?.name || 'Current host' }));
    hostSel.value = site.host_id;
  }
  hostSel.disabled = Boolean(site?.host_id) || !hosts.length;
  const name = el('input', { class: 'input', placeholder: 'Site name' });
  name.value = site?.name || '';
  const address = AddressPicker({
    address: site?.address || '',
    lat: site?.latitude,
    lng: site?.longitude,
  });
  const mode = el('select', { class: 'input' }, [
    el('option', { value: 'DISABLED', text: 'Disabled — no location check' }),
    el('option', { value: 'SOFT', text: 'Soft — warn if outside' }),
    el('option', { value: 'STRICT', text: 'Strict — block clock-in outside' }),
  ]);
  mode.value = site?.geofence_mode || 'SOFT';
  const radius = el('input', {
    class: 'input',
    type: 'number',
    min: '10',
    max: '5000',
    step: '10',
    placeholder: '150',
  });
  radius.value = String(site?.geofence_radius_m || 150);
  const err = el('div', { class: 'form-error' });
  const submit = el('button', { class: 'btn btn-primary', type: 'submit' }, [submitLabel]);

  function needsLocation() {
    return mode.value !== 'DISABLED';
  }

  name.addEventListener('blur', () => requireValue(name, 'Site name'));
  radius.addEventListener('blur', () => {
    const n = Number(radius.value);
    if (!Number.isInteger(n) || n < 10 || n > 5000) fieldError(radius.closest('.field'), 'Radius must be between 10 and 5 000 metres');
    else clearFieldError(radius.closest('.field'));
  });

  const form = el('form', {
    class: 'site-form',
    onSubmit: async (ev) => {
      ev.preventDefault();
      err.textContent = '';
      const hostId = hostSel.disabled && site?.host_id ? site.host_id : hostSel.value;
      if (!hostId) {
        fieldError(hostSel.closest('.field'), 'Choose a host');
        return;
      }
      clearFieldError(hostSel.closest('.field'));
      const siteName = requireValue(name, 'Site name');
      if (!siteName) return;
      const radiusM = Number(radius.value || 150);
      if (!Number.isInteger(radiusM) || radiusM < 10 || radiusM > 5000) {
        fieldError(radius.closest('.field'), 'Radius must be between 10 and 5 000 metres');
        return;
      }
      clearFieldError(radius.closest('.field'));
      if (!address.validate(needsLocation())) return;
      const place = address.getValue();
      submit.disabled = true;
      try {
        await onSubmit({
          hostId,
          name: siteName,
          address: place.address || undefined,
          latitude: isCoords(place.latitude, place.longitude) ? place.latitude : undefined,
          longitude: isCoords(place.latitude, place.longitude) ? place.longitude : undefined,
          geofenceMode: mode.value,
          geofenceRadiusM: radiusM,
        });
        dismissModal(form);
      } catch (e) {
        err.textContent = e.message;
        toast(e.message, 'err');
        shake(form);
      } finally {
        submit.disabled = false;
      }
    },
  }, [
    field('Host', hostSel),
    field('Name', name),
    field('Address', address),
    field('Geofence', mode),
    field('Geofence radius (metres)', radius),
    err,
    submit,
  ]);
  return form;
}
