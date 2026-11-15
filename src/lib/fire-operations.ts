import distance from '@turf/distance';
import destination from '@turf/destination';
import type { Incident, Node } from './centinela-data';

// Locators focalizados en Cochabamba y el Parque Nacional Tunari (11 Municipios y Comunidades Reales)
export const REFERENCE_POINTS = [
  { name: 'Cochabamba', lat: -17.3895, lng: -66.1568, kind: 'comunidad' },
  { name: 'Comunidad Tirani (Cercado / Parque Tunari)', lat: -17.3400, lng: -66.1620, kind: 'comunidad' },
  { name: 'Molinos Tiquipaya', lat: -17.3250, lng: -66.2200, kind: 'comunidad' },
  { name: 'Comunidad Laphia (Tiquipaya)', lat: -17.2800, lng: -66.2300, kind: 'comunidad' },
  { name: 'Chaupisuyu (Sacaba)', lat: -17.3600, lng: -66.0200, kind: 'comunidad' },
  { name: 'Bella Vista (Quillacollo)', lat: -17.3550, lng: -66.2850, kind: 'comunidad' },
  { name: 'Chocaya (Vinto)', lat: -17.3500, lng: -66.3200, kind: 'comunidad' },
  { name: 'Candelaria (Colomi)', lat: -17.3100, lng: -65.8600, kind: 'comunidad' },
  { name: 'Comunidad Taquiña (Cercado)', lat: -17.3350, lng: -66.1750, kind: 'comunidad' },
  { name: 'Comunidad Leuquepampa (Sipe Sipe)', lat: -17.4300, lng: -66.3800, kind: 'comunidad' },
  { name: 'Comunidad Linku (Morochata)', lat: -17.2200, lng: -66.5000, kind: 'comunidad' },
  { name: 'Comunidad Ramadas (Tapacarí)', lat: -17.5200, lng: -66.6000, kind: 'comunidad' },
  { name: 'Comunidad El Paso (Quillacollo)', lat: -17.3650, lng: -66.2550, kind: 'comunidad' },
  { name: 'Comunidad Chiñata (Sacaba)', lat: -17.4100, lng: -65.9800, kind: 'comunidad' },
  { name: 'Comunidad La Maica (Colcapirhua)', lat: -17.4150, lng: -66.2100, kind: 'comunidad' },
  { name: 'Comunidad Angostura (Arbieto)', lat: -17.5250, lng: -65.9750, kind: 'comunidad' },
  { name: 'Quillacollo', lat: -17.3925, lng: -66.2783, kind: 'comunidad' },
  { name: 'Sacaba', lat: -17.4042, lng: -66.0408, kind: 'comunidad' },
  { name: 'Tiquipaya', lat: -17.3380, lng: -66.2158, kind: 'comunidad' },
  { name: 'Vinto', lat: -17.3872, lng: -66.3180, kind: 'comunidad' },
  { name: 'Colcapirhua', lat: -17.3890, lng: -66.2390, kind: 'comunidad' },
  { name: 'Sipe Sipe', lat: -17.4520, lng: -66.3620, kind: 'comunidad' },
  { name: 'Colomi', lat: -17.3360, lng: -65.8710, kind: 'comunidad' },
  { name: 'Morochata', lat: -17.2350, lng: -66.5260, kind: 'comunidad' },
  { name: 'Tapacarí', lat: -17.5250, lng: -66.6100, kind: 'comunidad' },
  { name: 'Tunari · referencia', lat: -17.27, lng: -66.28, kind: 'área' },
  { name: 'Parque Nacional Tunari (SERNAP)', lat: -17.27, lng: -66.28, kind: 'área' },
  { name: 'Cuenca Taquiña (Protección Hídrica)', lat: -17.3200, lng: -66.1680, kind: 'área' },
  { name: 'Santuario Silvestre San Miguel', lat: -17.3000, lng: -66.2400, kind: 'área' },
  { name: 'Parque Nacional Carrasco (SERNAP)', lat: -17.1500, lng: -65.4500, kind: 'área' },
  { name: 'Laguna Alalay (Humedal Urbano)', lat: -17.4180, lng: -66.1360, kind: 'área' },
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