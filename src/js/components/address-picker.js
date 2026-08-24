import { el } from '../utils/dom.js';
import { icon } from '../icons.js';
import { searchPlaces, debounce, isCoords } from '../geocode.js';
import { fieldError, clearFieldError } from '../forms.js';
import { openMapPicker } from './map-picker-modal.js';

export function AddressPicker({ address = '', lat = null, lng = null } = {}) {
  const state = {
    address: address || '',
    lat: lat == null ? null : Number(lat),
    lng: lng == null ? null : Number(lng),
  };
  let abort;
  const input = el('input', {
    class: 'input',
    type: 'search',
    placeholder: 'Start typing a street, suburb, or place',
    autocomplete: 'off',
    value: state.address,
  });
  input.value = state.address;
  const list = el('ul', { class: 'suggest-list', role: 'listbox', hidden: true });
  const meta = el('p', { class: 'addr-meta muted' });
  const wrap = el('div', { class: 'addr-search' }, [
    el('div', { class: 'input-wrap addr-box' }, [icon('search', { size: 18 }), input]),
    list,
  ]);
  const mapBtn = el('button', {
    class: 'btn addr-map-btn',
    type: 'button',
    title: 'Pick on map',
    'aria-label': 'Pick on map',
  }, [icon('map-pin', { size: 18 }), 'Map']);

  function paintMeta() {
    if (isCoords(state.lat, state.lng)) {
      meta.textContent = state.address
        ? `Pinned · ${state.address}`
        : `Pinned · ${Number(state.lat).toFixed(5)}, ${Number(state.lng).toFixed(5)}`;
      meta.hidden = false;
    } else {
      meta.textContent = '';
      meta.hidden = true;
    }
  }

  function setPlace(place) {
    state.address = place.label || '';
    state.lat = place.lat;
    state.lng = place.lng;
    input.value = state.address;
    list.replaceChildren();
    list.hidden = true;
    paintMeta();
    const field = root.closest('.field');
    if (field) {
      field.classList.add('was-checked', 'is-ok');
      clearFieldError(field);
    }
  }

  function showSuggestions(places) {
    list.replaceChildren(
      ...places.map((place) =>
        el('li', {}, [
          el('button', {
            class: 'suggest-item',
            type: 'button',
            role: 'option',
            onClick: () => setPlace(place),
          }, [icon('map-pin', { size: 16 }), place.label]),
        ]),
      ),
    );
    list.hidden = !places.length;
  }

  const lookup = debounce(async (query) => {
    abort?.abort();
    abort = new AbortController();
    try {
      const places = await searchPlaces(query, { signal: abort.signal, near: isCoords(state.lat, state.lng) ? state : undefined });
      if (input.value.trim() === query.trim()) showSuggestions(places);
    } catch (err) {
      if (err.name === 'AbortError') return;
      list.hidden = true;
    }
  }, 320);

  input.addEventListener('input', () => {
    state.address = input.value;
    if (!input.value.trim()) {
      state.lat = null;
      state.lng = null;
      paintMeta();
      list.hidden = true;
      return;
    }
    if (input.value.trim().length < 3) {
      list.hidden = true;
      return;
    }
    lookup(input.value);
  });
  input.addEventListener('blur', () => {
    window.setTimeout(() => {
      list.hidden = true;
    }, 180);
  });
  mapBtn.addEventListener('click', () => {
    openMapPicker({
      lat: state.lat,
      lng: state.lng,
      onPick: setPlace,
    });
  });

  paintMeta();
  const root = el('div', { class: 'addr-picker' }, [
    el('div', { class: 'addr-row' }, [wrap, mapBtn]),
    meta,
  ]);
  root.getValue = () => ({
    address: String(input.value || '').trim(),
    latitude: isCoords(state.lat, state.lng) ? Number(state.lat) : null,
    longitude: isCoords(state.lat, state.lng) ? Number(state.lng) : null,
  });
  root.validate = (required) => {
    const field = root.closest('.field');
    const value = root.getValue();
    if (!required) {
      clearFieldError(field);
      return true;
    }
    if (!isCoords(value.latitude, value.longitude)) {
      fieldError(field, 'Search for an address or pick a point on the map');
      return false;
    }
    clearFieldError(field);
    field?.classList.add('was-checked', 'is-ok');
    return true;
  };
  return root;
}
