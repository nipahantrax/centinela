import type { Incident, Node } from "./centinela-data";
import type { HarmonizationStats } from "./harmonization";
import boundaries from "@/data/bolivia-departments.json";

export const BOLIVIA_BBOX = [-69.6, -22.9, -57.4, -9.6] as const;
export const REGIONS: { id: string; name: string; center: [number, number]; zoom: number }[] = [
  { id: "all", name: "Todo Bolivia", center: [-16.5, -64.5], zoom: 6 },
  { id: "Santa Cruz", name: "Santa Cruz", center: [-17.3, -61.8], zoom: 7 },
  { id: "Beni", name: "Beni", center: [-14.4, -65.3], zoom: 7 },
  { id: "Cochabamba", name: "Cochabamba / Parque Tunari", center: [-17.31, -66.2], zoom: 10 },
  { id: "La Paz", name: "La Paz", center: [-15.5, -68], zoom: 7 },
  { id: "Tarija", name: "Tarija", center: [-21.5, -63.8], zoom: 8 },
  { id: "Pando", name: "Pando", center: [-11.2, -67.5], zoom: 8 },
  { id: "Chuquisaca", name: "Chuquisaca", center: [-19.8, -64.3], zoom: 8 },
  { id: "Oruro", name: "Oruro", center: [-18.7, -67.6], zoom: 8 },
  { id: "Potosí", name: "Potosí", center: [-20.3, -67], zoom: 7 },
];
export type WeatherResult = { weather: Node["weather"] | null; date: string | null; error: string | null };
export type Snapshot = { incidents: Incident[]; source: "FIRMS" | "EONET" | "Sin datos"; messages: string[]; updated: string; firmsConfigured: boolean; eonetCount: number; harmonizationStats?: HarmonizationStats };
export function inBolivia(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -22.9 && lat <= -9.6 && lng >= -69.6 && lng <= -57.4;
}
export function parsePower(payload: { properties?: { parameter?: Record<string, Record<string, number>> } }): WeatherResult {
  const p = payload.properties?.parameter;
  const day = Object.keys(p?.['T2M'] ?? {}).sort().reverse().find(d => ["T2M", "RH2M", "WS10M", "WD10M"].every(k => Number.isFinite(p?.[k]?.[d]) && (p?.[k]?.[d] ?? -999) > -900));
  if (!p || !day) return { weather: null, date: null, error: "NASA POWER aún no dispone de datos válidos para este punto." };
  const deg = p['WD10M']?.[day] ?? 0;
  return { weather: { temp: p['T2M']?.[day] ?? 0, rh: p['RH2M']?.[day] ?? 0, wind: Math.round((p['WS10M']?.[day] ?? 0) * 3.6 * 10) / 10, windDeg: deg, windDir: ["N", "NE", "E", "SE", "S", "SO", "O", "NO"][Math.round(deg / 45) % 8] ?? "N" }, date: `${day.slice(0,4)}-${day.slice(4,6)}-${day.slice(6,8)}`, error: null };
}
export function liveIncident(id: string, lat: number, lng: number, date: string, source: Incident["source"], zone: string, frp: number | null = null, confidence: number | null = null): Incident {
  return { id, lat, lng, date, source, zone, frp, confidence, areaHa: null, altitude: null, status: "Monitoreo", live: true, hydrant: { name: "Sin información local verificada", distKm: null }, route: { state: "No verificada", distKm: null, etaMin: null } };
}
export function parseFirms(csv: string, source: "VIIRS" | "MODIS"): Incident[] {
  const lines = csv.trim().split(/\r?\n/); const header = (lines.shift() ?? "").split(",");
  if (!header.includes("latitude") || !header.includes("longitude")) throw new Error("Invalid FIRMS response");
  return lines.flatMap((line) => {
    const cols = line.split(","); const get = (key: string) => cols[header.indexOf(key)] ?? "";
    const lat = Number(get("latitude")), lng = Number(get("longitude"));
    if (!inBolivia(lat, lng)) return [];
    const raw = get("confidence"); const confidence = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : null;
    const frp = get("frp") !== "" && Number.isFinite(Number(get("frp"))) ? Number(get("frp")) : null;
    const time = get("acq_time").padStart(4, "0"); const date = `${get("acq_date")}T${time.slice(0,2)}:${time.slice(2,4)}:00Z`;
    if (!Number.isFinite(Date.parse(date))) return [];
    return [liveIncident(`FIRMS-${source}-${get("acq_date")}-${time}-${lat}-${lng}`, lat, lng, date, source, "Bolivia · foco satelital", frp, confidence)];
  });
}
export type EonetEvent = { id: string; title: string; closed?: string | null; geometry: { type: string; coordinates: number[]; date: string }[] };
export function parseEonet(events: EonetEvent[]): Incident[] {
  return events.flatMap(e => {
    if (e.closed) return [];
    const g = [...e.geometry].reverse().find(g => g.type === "Point" && inBolivia(g.coordinates[1] ?? NaN, g.coordinates[0] ?? NaN));
    if (!g) return [];
    return [liveIncident(e.id, g.coordinates[1] ?? 0, g.coordinates[0] ?? 0, g.date, "EONET", e.title)];
  });
}
export function gibsUrl(layer: "viirs" | "modis" | "viirsThermal", date: string) {
  const name = layer === "viirs" ? "VIIRS_SNPP_CorrectedReflectance_TrueColor" : layer === "viirsThermal" ? "VIIRS_SNPP_Thermal_Anomalies_375m_All" : "MODIS_Terra_Thermal_Anomalies_All";
  const matrix = layer === "viirs" ? "GoogleMapsCompatible_Level9" : layer === "viirsThermal" ? "GoogleMapsCompatible_Level8" : "GoogleMapsCompatible_Level7";
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${name}/default/${date}/${matrix}/{z}/{y}/{x}.${layer === "viirs" ? "jpeg" : "mvt"}`;
}
function insideRing(lng: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j]; if (!a || !b) continue;
    const x = a[0] ?? 0, y = a[1] ?? 0, bx = b[0] ?? 0, by = b[1] ?? 0;
    if ((y > lat) !== (by > lat) && lng < (bx - x) * (lat - y) / (by - y) + x) inside = !inside;
  }
  return inside;
}
export function departmentAt(lat: number, lng: number): string | null {
  for (const f of boundaries.features) {
    const polygons = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polygons as number[][][][]) {
      const outer = poly[0];
      if (outer && insideRing(lng, lat, outer) && !poly.slice(1).some(r => insideRing(lng, lat, r))) return f.properties.name;
    }
  }
  return null;
}
export function regionalIncidents(incidents: Incident[], regionId: string) {
  return incidents.filter(i => regionId === "all" || departmentAt(i.lat, i.lng) === regionId);
}