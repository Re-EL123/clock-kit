import { beginWork, endWork } from './busy.js';

export const GEO_TIMEOUT_MS = 15000;

const MESSAGES = {
  UNSUPPORTED: 'This device cannot share a location. Clock-Kit needs GPS to clock in.',
  PERMISSION_DENIED: 'Allow location for Clock-Kit, then try Clock in again.',
  TIMEOUT: 'Could not get a GPS fix in time. Move somewhere more open and try again.',
  UNAVAILABLE: 'Location is unavailable right now. Turn on GPS and try again.',
  INACCURATE: 'Your location is not accurate enough to clock in at this site',
  OUTSIDE_GEOFENCE: 'You are outside the site geofence',
  LOCATION_UNAVAILABLE: 'Clock-Kit could not confirm your location',
};

const EARTH_RADIUS_M = 6371000;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function locationFailure(code) {
  return { ok: false, code, message: MESSAGES[code] || MESSAGES.UNAVAILABLE };
}

export function geofenceUserMessage(result) {
  return MESSAGES[result] || MESSAGES.OUTSIDE_GEOFENCE;
}

export function positionErrorCode(err) {
  const n = Number(err?.code);
  if (n === 1) return 'PERMISSION_DENIED';
  if (n === 3) return 'TIMEOUT';
  return 'UNAVAILABLE';
}

export function readCoords(coords) {
  const latitude = Number(coords?.latitude);
  const longitude = Number(coords?.longitude);
  const accuracy = Number(coords?.accuracy);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return locationFailure('UNAVAILABLE');
  }
  return {
    ok: true,
    location: {
      latitude,
      longitude,
      accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
    },
  };
}

export function evaluateGeofence({
  mode,
  radiusM,
  siteLat,
  siteLng,
  lat,
  lng,
  accuracy,
} = {}) {
  if (!mode || mode === 'DISABLED') {
    return { ok: true, result: 'SKIPPED', distance: null };
  }

  const radius = Number(radiusM);
  const fence = Number.isFinite(radius) && radius > 0 ? radius : 150;
  const hasSite = Number.isFinite(Number(siteLat)) && Number.isFinite(Number(siteLng));
  const hasFix = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

  if (!hasFix || !hasSite) {
    return {
      ok: mode !== 'STRICT',
      result: 'LOCATION_UNAVAILABLE',
      distance: null,
    };
  }

  const distance = Math.round(haversineMeters(Number(siteLat), Number(siteLng), Number(lat), Number(lng)));
  const acc = Number(accuracy);
  const hasAccuracy = Number.isFinite(acc) && acc >= 0;
  const provenInside = hasAccuracy && distance + acc <= fence;
  const provenOutside = hasAccuracy ? distance - acc > fence : distance > fence;

  if (mode === 'SOFT') {
    if (provenInside) return { ok: true, result: 'INSIDE', distance };
    if (provenOutside) return { ok: true, result: 'OUTSIDE_SOFT', distance };
    if (hasAccuracy) return { ok: true, result: 'LOCATION_INACCURATE', distance };
    return { ok: true, result: distance <= fence ? 'INSIDE' : 'OUTSIDE_SOFT', distance };
  }

  if (!hasAccuracy) return { ok: false, result: 'LOCATION_INACCURATE', distance };
  if (provenInside) return { ok: true, result: 'INSIDE', distance };
  if (provenOutside) return { ok: false, result: 'OUTSIDE_GEOFENCE', distance };
  return { ok: false, result: 'LOCATION_INACCURATE', distance };
}

export function assignmentGeofence(assignment) {
  const site = assignment?.sites || {};
  return {
    mode: assignment?.clocking_policies?.geofence_mode || site.geofence_mode || 'SOFT',
    radiusM: Number(site.geofence_radius_m) > 0 ? Number(site.geofence_radius_m) : 150,
    siteLat: site.latitude,
    siteLng: site.longitude,
  };
}

export function readDeviceLocation({ geolocation, timeout = GEO_TIMEOUT_MS } = {}) {
  const geo = geolocation || (typeof navigator !== 'undefined' ? navigator.geolocation : null);
  if (!geo?.getCurrentPosition) {
    return Promise.resolve(locationFailure('UNSUPPORTED'));
  }
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (pos) => resolve(readCoords(pos?.coords)),
      (err) => resolve(locationFailure(positionErrorCode(err))),
      { enableHighAccuracy: true, timeout, maximumAge: 0 },
    );
  });
}

export async function captureLocation(options = {}) {
  const busy = typeof document !== 'undefined';
  if (busy) beginWork();
  try {
    return await readDeviceLocation(options);
  } finally {
    if (busy) endWork();
  }
}
