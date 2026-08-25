import { describe, expect, it } from 'vitest';
import {
  assignmentGeofence,
  evaluateGeofence,
  locationFailure,
  positionErrorCode,
  readCoords,
  readDeviceLocation,
} from '../../src/js/geolocation.js';

function fakeGeo(result) {
  return {
    getCurrentPosition(success, error) {
      if (result.error) error(result.error);
      else success({ coords: result.coords });
    },
  };
}

describe('readCoords', () => {
  it('keeps a GPS fix with accuracy', () => {
    expect(readCoords({ latitude: -26.2, longitude: 28.1, accuracy: 14 })).toEqual({
      ok: true,
      location: { latitude: -26.2, longitude: 28.1, accuracy: 14 },
    });
  });

  it('rejects incomplete coordinates', () => {
    expect(readCoords({ latitude: -26.2 })).toMatchObject({ ok: false, code: 'UNAVAILABLE' });
  });
});

describe('positionErrorCode', () => {
  it('maps browser geolocation error codes', () => {
    expect(positionErrorCode({ code: 1 })).toBe('PERMISSION_DENIED');
    expect(positionErrorCode({ code: 2 })).toBe('UNAVAILABLE');
    expect(positionErrorCode({ code: 3 })).toBe('TIMEOUT');
    expect(locationFailure('PERMISSION_DENIED').message).toMatch(/Allow location/);
  });
});

describe('readDeviceLocation', () => {
  it('returns a loud permission error instead of null', async () => {
    const result = await readDeviceLocation({
      geolocation: fakeGeo({ error: { code: 1 } }),
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('PERMISSION_DENIED');
  });

  it('returns coordinates from the device', async () => {
    const result = await readDeviceLocation({
      geolocation: fakeGeo({ coords: { latitude: -25.99, longitude: 28.13, accuracy: 8 } }),
    });
    expect(result).toEqual({
      ok: true,
      location: { latitude: -25.99, longitude: 28.13, accuracy: 8 },
    });
  });
});

describe('evaluateGeofence', () => {
  it('blocks a 40km-accurate desktop fix on a strict site', () => {
    const result = evaluateGeofence({
      mode: 'STRICT',
      radiusM: 150,
      siteLat: -25.989,
      siteLng: 28.128,
      lat: -25.989,
      lng: 28.128,
      accuracy: 40000,
    });
    expect(result.ok).toBe(false);
    expect(result.result).toBe('LOCATION_INACCURATE');
  });
});

describe('assignmentGeofence', () => {
  it('prefers the assignment policy over the site default', () => {
    expect(assignmentGeofence({
      clocking_policies: { geofence_mode: 'STRICT' },
      sites: { geofence_mode: 'SOFT', geofence_radius_m: 80, latitude: -26, longitude: 28 },
    })).toMatchObject({ mode: 'STRICT', radiusM: 80 });
  });
});
