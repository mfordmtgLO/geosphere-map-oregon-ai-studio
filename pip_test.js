function pointInRing(point, ring) {
  let inside = false;
  const lng = point[0];
  const lat = point[1];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const crossesLatitude = (yi > lat) !== (yj > lat);
    const intersectLng = ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crossesLatitude && lng < intersectLng) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, rings) {
  if (!rings || !rings.length || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some((hole) => pointInRing(point, hole));
}

function pointInGeometry(point, geometry) {
  if (!geometry) return false;
  if (geometry.type === "Polygon") return pointInPolygon(point, geometry.coordinates);
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }
  return false;
}

function findTractForPoint(lng, lat, featureCollection) {
   const point = [lng, lat];
   if (!featureCollection || !featureCollection.features) return null;
   for (const feature of featureCollection.features) {
       // Rough bounding box check? We don't have bounds here unless we compute it. But for a single point, 
       // testing all ~800 tracts in Oregon is fast enough.
       if (pointInGeometry(point, feature.geometry)) {
           return feature.properties.GEOID;
       }
   }
   return null;
}
