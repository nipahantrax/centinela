import distance from '@turf/distance';
import destination from '@turf/destination';
import type { Incident, Node } from './centinela-data';

// Named locators only: distances are to points, not to community/park boundaries.
export const REFERENCE_POINTS = [
  { name: 'Cochabamba', lat: -17.3895, lng: -66.1568, kind: 'comunidad' },
  { name: 'Santa Cruz de la Sierra', lat: -17.7833, lng: -63.1821, kind: 'comunidad' },
  { name: 'Trinidad', lat: -14.8333, lng: -64.9, kind: 'comunidad' },
  { name: 'La Paz', lat: -16.5, lng: -68.15, kind: 'comunidad' },
  { name: 'Tarija', lat: -21.5355, lng: -64.7296, kind: 'comunidad' },
  { name: 'Cobija', lat: -11.0267, lng: -68.7692, kind: 'comunidad' },
  { name: 'Sucre', lat: -19.0333, lng: -65.2627, kind: 'comunidad' },
  { name: 'Oruro', lat: -17.9667, lng: -67.1167, kind: 'comunidad' },
  { name: 'Potosí', lat: -19.5833, lng: -65.75, kind: 'comunidad' },
  { name: 'San Ignacio de Velasco · Chiquitania', lat: -16.3667, lng: -60.95, kind: 'comunidad' },
  { name: 'Rurrenabaque', lat: -14.44, lng: -67.53, kind: 'comunidad' },
  { name: 'Tunari · referencia', lat: -17.27, lng: -66.28, kind: 'área' },
  { name: 'Madidi · referencia', lat: -13.8, lng: -67.63, kind: 'área' },
  { name: 'Noel Kempff Mercado · referencia', lat: -14.3, lng: -60.8, kind: 'área' },
  { name: 'Amboró · referencia', lat: -17.7, lng: -63.6, kind: 'área' },
  { name: 'Kaa-Iya · referencia', lat: -19.1, lng: -61.5, kind: 'área' },
] as const;
export function nearestReference(lat: number, lng: number, kind: 'comunidad' | 'área') {
  return REFERENCE_POINTS.filter(p => p.kind === kind).map(p => ({ ...p, km: distance([lng, lat], [p.lng, p.lat]) })).sort((a,b) => a.km - b.km)[0];
}
export function isFreshDetection(i: Incident, now = Date.now()) {
  const age = now - Date.parse(i.date);
  return Boolean(i.live) && i.status !== 'Controlado' && Number.isFinite(age) && age >= 0 && age <= 48 * 3600000;
}
// Attention warnings are driven ONLY by fresh real satellite detections near a
// named community from FIRMS only. Computed climate risk is our own estimate and never triggers
// an alert by itself.
export function attentionDetections(incidents: Incident[], now = Date.now()) {
  return incidents.filter(i => (i.source === 'VIIRS' || i.source === 'MODIS') && isFreshDetection(i, now) && (nearestReference(i.lat, i.lng, 'comunidad')?.km ?? Infinity) <= 5);
}
export function requiresAttention(incidents: Incident[], now = Date.now()) {
  return attentionDetections(incidents, now).length > 0;
}
export type Horizon = 1 | 3 | 6;
export function projectFire(lat: number, lng: number, weather: Node['weather'], hours: Horizon) {
  // Exploratory wind-driven envelope, NOT Rothermel, a trained AI, or an operational forecast.
  // Fuel, slope, fuel moisture, fire perimeter and validated ROS are unavailable.
  const dryness = Math.max(0, Math.min(1, 1 - weather.rh / 100));
  const heat = Math.max(0.25, Math.min(1.5, weather.temp / 30));
  const km = Math.max(0, weather.wind) * 0.03 * dryness * heat * hours;
  const bearing = (weather.windDeg + 180) % 360; // POWER wind direction is FROM.
  const polygon: [number,number][] = [[lat,lng]];
  for (let angle = -25; angle <= 25; angle += 5) {
    const p = destination([lng,lat], km, bearing + angle).geometry.coordinates;
    polygon.push([p[1] ?? lat, p[0] ?? lng]);
  }
  polygon.push([lat,lng]);
  return { km, bearing, polygon };
}
export function emergencyMessage(lat: number, lng: number, accuracy: number, body: string) {
  return `SOS CENTINELA · Reporte ciudadano por verificar\n${body}\nGPS: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${Math.round(accuracy)} m)\nhttps://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}\nSolicito contacto y evaluación urgente. No hay despacho confirmado.`;
}