export function isCoords(lat, lng) {
  if (lat === '' || lng === '' || lat == null || lng == null) return false;
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180;
}

export async function searchPlaces(query, { near } = {}) {
  const q = String(query || '').trim();
  if (q.length < 3) return [];
  const { api } = await import('./api.js');
  const body = { q };
  if (isCoords(near?.lat, near?.lng)) {
    body.lat = Number(near.lat);
    body.lng = Number(near.lng);
  }
  const data = await api('system', 'search-places', { body });
  return data.places || [];
}

export async function reversePlace(lat, lng) {
  if (!isCoords(lat, lng)) return null;
  const { api } = await import('./api.js');
  return api('system', 'reverse-place', { body: { lat: Number(lat), lng: Number(lng) } });
}

export function debounce(fn, ms = 450) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), ms);
  };
}
