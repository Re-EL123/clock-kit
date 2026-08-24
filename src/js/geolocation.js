import { beginWork, endWork } from './busy.js';

export async function captureLocation() {
  if (!navigator.geolocation) return null;
  beginWork();
  try {
    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 },
      );
    });
  } finally {
    endWork();
  }
}
