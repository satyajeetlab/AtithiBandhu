// Ray-casting point-in-polygon test. polygon = [[lat,lng], ...]
function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];

    const intersects =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;

    if (intersects) inside = !inside;
  }
  return inside;
}

// Haversine distance in meters between two lat/lng points.
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Given a point and a list of Geofence documents, return the highest-risk
// zone the point currently sits in (or null if it's in no defined zone).
function classifyZone(lat, lng, geofences) {
  const priority = { restricted: 3, danger: 2, safe: 1 };
  let match = null;

  for (const zone of geofences) {
    if (isPointInPolygon(lat, lng, zone.coordinates)) {
      if (!match || priority[zone.type] > priority[match.type]) {
        match = zone;
      }
    }
  }
  return match;
}

module.exports = { isPointInPolygon, distanceMeters, classifyZone };
