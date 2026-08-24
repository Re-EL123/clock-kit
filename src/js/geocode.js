const SA = { lat: -26.2041, lng: 28.0473 };
const PHOTON = 'https://photon.komoot.io';

export function isCoords(lat, lng) {
  if (lat === '' || lng === '' || lat == null || lng == null) return false;
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180;
}

export function formatPhoton(feature) {
  const props = feature?.properties || {};
  const coords = feature?.geometry?.coordinates || [];
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  const street = props.housenumber && props.street
    ? `${props.housenumber} ${props.street}`
    : props.street || '';
  const locality = props.city || props.town || props.village || props.district || '';
  const bits = [props.name, street, locality, props.state].filter((part, index, list) => part && list.indexOf(part) === index);
  return {
    label: bits.join(', ') || 'Pinned location',
    lat,
    lng,
  };
}

export async function searchPlaces(query, { signal, near = SA } = {}) {
  const q = String(query || '').trim();
  if (q.length < 3) return [];
  const url = new URL(`${PHOTON}/api/`);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '6');
  url.searchParams.set('lang', 'en');
  if (isCoords(near.lat, near.lng)) {
    url.searchParams.set('lat', String(near.lat));
    url.searchParams.set('lon', String(near.lng));
  }
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Address lookup is unavailable');
  const data = await res.json();
  return (data.features || []).map(formatPhoton).filter((place) => isCoords(place.lat, place.lng));
}

export async function reversePlace(lat, lng, { signal } = {}) {
  if (!isCoords(lat, lng)) return null;
  const url = new URL(`${PHOTON}/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('lang', 'en');
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) return { label: 'Pinned location', lat: Number(lat), lng: Number(lng) };
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return { label: 'Pinned location', lat: Number(lat), lng: Number(lng) };
  return formatPhoton(feature);
}

export function debounce(fn, ms = 350) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}
