export type Status = "Activo" | "Monitoreo" | "Controlado";
export type Zone = string;

export interface Incident {
  id: string;
  date: string; // ISO
  zone: Zone;
  lat: number;
  lng: number;
  confidence: number | null;
  frp: number | null; // MW
  areaHa: number | null;
  source: "MODIS" | "VIIRS" | "MODIS+VIIRS armonizado" | "EONET";
  live?: boolean;
  status: Status;
  altitude: number | null;
  hydrant: { name: string; distKm: number | null };
  route: { state: "Ruta Habilitada" | "Ruta Restringida" | "Solo a pie" | "No verificada"; distKm: number | null; etaMin: number | null };
}

export interface Node {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  weather: { temp: number; wind: number; windDir: string; windDeg: number; rh: number };
}

export const NODES: Node[] = [
  { id: "tunari", name: "Cochabamba · Parque Tunari", center: [-17.31, -66.2], zoom: 11, weather: { temp: 32, wind: 40, windDir: "NE", windDeg: 45, rh: 15 } },
  { id: "valle", name: "Valle Alto", center: [-17.52, -65.92], zoom: 11, weather: { temp: 29, wind: 28, windDir: "E", windDeg: 90, rh: 22 } },
  { id: "sanpedro", name: "Cerro San Pedro", center: [-17.384, -66.135], zoom: 14, weather: { temp: 30, wind: 22, windDir: "N", windDeg: 0, rh: 24 } },
  { id: "cota", name: "Cerro Cota", center: [-17.355, -66.09], zoom: 13, weather: { temp: 31, wind: 33, windDir: "NE", windDeg: 45, rh: 18 } },
];

/** Ignition risk 0-100 from temperature, wind and relative humidity. */
export function ignitionRisk(temp: number, wind: number, rh: number) {
  const t = Math.min(Math.max((temp - 6) / 30, 0), 1);
  const w = Math.min(wind / 45, 1);
  const h = 1 - Math.min(rh / 70, 1);
  return Math.round((t * 0.35 + w * 0.3 + h * 0.35) * 100);
}

export function riskLabel(r: number) {
  if (r >= 80) return { label: "Muy Alto", tone: "destructive" as const };
  if (r >= 60) return { label: "Alto", tone: "fire" as const };
  if (r >= 40) return { label: "Moderado", tone: "warning" as const };
  return { label: "Bajo", tone: "success" as const };
}

const now = new Date("2026-10-21T03:00:00Z").getTime();
const h = (hrs: number) => new Date(now - hrs * 3600_000).toISOString();

export const INCIDENTS: Incident[] = [
  { id: "INC-2026-0712", date: h(0.4), zone: "Parque N. Tunari", lat: -17.2954, lng: -66.2381, confidence: 94, frp: 48.2, areaHa: 36.5, source: "MODIS+VIIRS armonizado", status: "Activo", altitude: 3412, hydrant: { name: "Represa Wara Wara", distKm: 3.2 }, route: { state: "Ruta Habilitada", distKm: 15.5, etaMin: 28 } },
  { id: "INC-2026-0711", date: h(1.2), zone: "Parque N. Tunari", lat: -17.3102, lng: -66.1745, confidence: 87, frp: 31.6, areaHa: 18.2, source: "VIIRS", status: "Activo", altitude: 3025, hydrant: { name: "Hidrante GAMC H-114 Tiquipaya", distKm: 2.1 }, route: { state: "Ruta Restringida", distKm: 11.8, etaMin: 34 } },
  { id: "INC-2026-0710", date: h(2.6), zone: "Cerro San Pedro", lat: -17.3858, lng: -66.1318, confidence: 72, frp: 12.4, areaHa: 4.1, source: "VIIRS", status: "Monitoreo", altitude: 2790, hydrant: { name: "Hidrante GAMC H-031 Av. Costanera", distKm: 0.9 }, route: { state: "Ruta Habilitada", distKm: 3.4, etaMin: 9 } },
  { id: "INC-2026-0709", date: h(4.1), zone: "Cerro Cota", lat: -17.3561, lng: -66.0874, confidence: 81, frp: 22.9, areaHa: 9.7, source: "MODIS+VIIRS armonizado", status: "Activo", altitude: 2950, hydrant: { name: "Tanque SEMAPA Cota", distKm: 1.6 }, route: { state: "Solo a pie", distKm: 7.2, etaMin: 41 } },
  { id: "INC-2026-0708", date: h(9), zone: "Parque N. Tunari", lat: -17.2731, lng: -66.3012, confidence: 66, frp: 9.1, areaHa: 6.3, source: "MODIS", status: "Monitoreo", altitude: 3680, hydrant: { name: "Laguna Macro", distKm: 4.4 }, route: { state: "Solo a pie", distKm: 21.0, etaMin: 62 } },
  { id: "INC-2026-0707", date: h(20), zone: "Valle Alto", lat: -17.5412, lng: -65.8603, confidence: 78, frp: 15.7, areaHa: 12.0, source: "VIIRS", status: "Controlado", altitude: 2730, hydrant: { name: "Represa La Angostura", distKm: 5.8 }, route: { state: "Ruta Habilitada", distKm: 32.4, etaMin: 45 } },
  { id: "INC-2026-0706", date: h(34), zone: "Parque N. Tunari", lat: -17.3217, lng: -66.2604, confidence: 89, frp: 27.3, areaHa: 21.4, source: "MODIS+VIIRS armonizado", status: "Controlado", altitude: 3190, hydrant: { name: "Hidrante GAMC H-140 Quillacollo", distKm: 2.7 }, route: { state: "Ruta Habilitada", distKm: 18.1, etaMin: 31 } },
  { id: "INC-2026-0705", date: h(52), zone: "Cerro San Pedro", lat: -17.3812, lng: -66.1391, confidence: 70, frp: 6.4, areaHa: 2.2, source: "VIIRS", status: "Controlado", altitude: 2710, hydrant: { name: "Hidrante GAMC H-029", distKm: 0.6 }, route: { state: "Ruta Habilitada", distKm: 3.0, etaMin: 8 } },
  { id: "INC-2026-0704", date: h(77), zone: "Cerro Cota", lat: -17.3489, lng: -66.0951, confidence: 75, frp: 11.2, areaHa: 5.5, source: "MODIS", status: "Controlado", altitude: 2880, hydrant: { name: "Tanque SEMAPA Cota", distKm: 1.2 }, route: { state: "Ruta Habilitada", distKm: 6.8, etaMin: 19 } },
  { id: "INC-2026-0703", date: h(110), zone: "Parque N. Tunari", lat: -17.2889, lng: -66.1932, confidence: 91, frp: 39.8, areaHa: 44.0, source: "MODIS+VIIRS armonizado", status: "Controlado", altitude: 3550, hydrant: { name: "Represa Escalerani", distKm: 6.1 }, route: { state: "Ruta Restringida", distKm: 24.6, etaMin: 52 } },
  { id: "INC-2026-0702", date: h(140), zone: "Valle Alto", lat: -17.5603, lng: -65.8221, confidence: 64, frp: 7.8, areaHa: 3.9, source: "VIIRS", status: "Controlado", altitude: 2760, hydrant: { name: "Pozo Punata P-07", distKm: 2.3 }, route: { state: "Ruta Habilitada", distKm: 41.2, etaMin: 50 } },
];

export const HYDRANTS: { name: string; lat: number; lng: number }[] = [
  { name: "Represa Wara Wara", lat: -17.287, lng: -66.215 },
  { name: "Hidrante H-114 Tiquipaya", lat: -17.335, lng: -66.215 },
  { name: "Hidrante H-031 Costanera", lat: -17.392, lng: -66.14 },
  { name: "Tanque SEMAPA Cota", lat: -17.362, lng: -66.1 },
  { name: "Laguna Macro", lat: -17.26, lng: -66.29 },
  { name: "Hidrante H-140 Quillacollo", lat: -17.39, lng: -66.275 },
  { name: "Represa La Angostura", lat: -17.53, lng: -65.92 },
];

export const EVAC_ROUTES: [number, number][][] = [
  [[-17.30, -66.24], [-17.33, -66.235], [-17.36, -66.24], [-17.395, -66.27]],
  [[-17.31, -66.175], [-17.34, -66.17], [-17.37, -66.16], [-17.393, -66.157]],
  [[-17.356, -66.088], [-17.37, -66.11], [-17.39, -66.13]],
];

// Simplified Tunari National Park boundary (approximate)
export const TUNARI_BOUNDARY: [number, number][] = [
  [-17.22, -66.48], [-17.2, -66.35], [-17.21, -66.2], [-17.24, -66.08], [-17.3, -66.04],
  [-17.33, -66.1], [-17.335, -66.18], [-17.345, -66.27], [-17.36, -66.36], [-17.33, -66.46], [-17.27, -66.5],
];

export const WEEK_SERIES = [
  { day: "15 Oct", modis: 4, viirs: 9, armonizado: 11 },
  { day: "16 Oct", modis: 6, viirs: 12, armonizado: 15 },
  { day: "17 Oct", modis: 3, viirs: 8, armonizado: 9 },
  { day: "18 Oct", modis: 7, viirs: 15, armonizado: 18 },
  { day: "19 Oct", modis: 9, viirs: 19, armonizado: 23 },
  { day: "20 Oct", modis: 11, viirs: 22, armonizado: 27 },
  { day: "21 Oct", modis: 8, viirs: 17, armonizado: 21 },
];

export function fmtDate(iso: string) {
  const d = new Date(iso);
  // Normalize NBSP/narrow NBSP so server (workerd) and browser render identical text (hydration-safe).
  return d.toLocaleString("es-BO", { timeZone: "America/La_Paz", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(/[  ]/g, " ");
}

/** Spread cone polygon from a point following wind bearing (degrees, FROM direction). */
export function spreadCone(lat: number, lng: number, windFromDeg: number, windKmh: number): [number, number][] {
  const toDeg = (windFromDeg + 180) % 360; // fire travels downwind
  const lenKm = 1 + windKmh / 12;
  const half = 25;
  const pts: [number, number][] = [[lat, lng]];
  for (let a = -half; a <= half; a += 10) {
    const b = ((toDeg + a) * Math.PI) / 180;
    pts.push([lat + (lenKm / 111) * Math.cos(b), lng + (lenKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(b)]);
  }
  return pts;
}
