import { el, toast } from '../utils/dom.js';
import { Modal } from './modal.js';
import { icon } from '../icons.js';
import { isCoords, reversePlace } from '../geocode.js';
import { popIn } from '../motion.js';

const FALLBACK_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export function openMapPicker({ lat, lng, onPick } = {}) {
  const status = el('p', { class: 'muted', text: 'Tap the map to drop a pin, then confirm.' });
  const mapEl = el('div', { class: 'map-canvas', role: 'application', 'aria-label': 'Site map' });
  let map;
  let marker;
  let maplibregl;
  let picked = isCoords(lat, lng) ? { lat: Number(lat), lng: Number(lng) } : null;

  function placeMarker(next) {
    picked = next;
    if (!map || !maplibregl) return;
    if (marker) marker.setLngLat([next.lng, next.lat]);
    else {
      marker = new maplibregl.Marker({ color: '#21396A', draggable: true })
        .setLngLat([next.lng, next.lat])
        .addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        picked = { lat: pos.lat, lng: pos.lng };
        status.textContent = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
      });
    }
    status.textContent = `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`;
  }

  const node = Modal({
    title: 'Pick site on the map',
    wide: true,
    onClose: () => {
      map?.remove();
      node.remove();
    },
    children: [
      status,
      mapEl,
      el('div', { class: 'modal-actions' }, [
        el('button', {
          class: 'btn',
          type: 'button',
          onClick: () => {
            map?.remove();
            node.remove();
          },
        }, ['Cancel']),
        el('button', {
          class: 'btn btn-primary',
          type: 'button',
          onClick: async () => {
            if (!picked) {
              toast('Tap the map to drop a pin', 'err');
              return;
            }
            try {
              const place = await reversePlace(picked.lat, picked.lng);
              onPick?.(place || { ...picked, label: 'Pinned location' });
              map?.remove();
              node.remove();
            } catch (err) {
              toast(err.message, 'err');
            }
          },
        }, [icon('check', { size: 16 }), 'Use this point']),
      ]),
    ],
  });
  node.querySelector('.modal')?.classList.add('modal-map');
  document.body.append(node);
  popIn(node.querySelector('.modal'));

  queueMicrotask(async () => {
    const mod = await import('maplibre-gl');
    maplibregl = mod.default || mod;
    await import('maplibre-gl/dist/maplibre-gl.css');
    const start = picked || { lat: -26.2041, lng: 28.0473 };
    try {
      map = new maplibregl.Map({
        container: mapEl,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [start.lng, start.lat],
        zoom: picked ? 16 : 11,
        attributionControl: true,
      });
    } catch {
      map = new maplibregl.Map({
        container: mapEl,
        style: FALLBACK_STYLE,
        center: [start.lng, start.lat],
        zoom: picked ? 16 : 11,
      });
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      map.resize();
      requestAnimationFrame(() => map.resize());
      if (picked) placeMarker(picked);
    });
    map.on('click', (ev) => {
      placeMarker({ lat: ev.lngLat.lat, lng: ev.lngLat.lng });
    });
    if (!picked && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        if (picked) return;
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.easeTo({ center: [here.lng, here.lat], zoom: 14 });
      }, () => {}, { maximumAge: 120000, timeout: 4000 });
    }
  });
}
