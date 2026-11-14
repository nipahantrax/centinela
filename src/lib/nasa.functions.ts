import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { BOLIVIA_BBOX, departmentAt, parseEonet, parseFirms, parsePower, type EonetEvent, type Snapshot, type WeatherResult } from "./nasa-data";
import { harmonizeHotspots } from "./harmonization";

// Public NASA data only; no user credentials or private information cross this boundary.
const cache = new Map<string, { expires: number; value: unknown }>();
async function cached<T>(key: string, ttl: number, work: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.value as T;
  const value = await work();
  if (cache.size > 100) cache.clear();
  cache.set(key, { expires: Date.now() + ttl, value });
  return value;
}
async function nasaFetch(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("NASA unavailable");
  return response;
}
export const getPower = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ lat: z.number().min(-22.9).max(-9.6), lng: z.number().min(-69.6).max(-57.4) }).parse(data))
  .handler(async ({ data }): Promise<WeatherResult> => cached(`power:${data.lat.toFixed(3)}:${data.lng.toFixed(3)}`, 3600000, async () => {
    try {
      const end = new Date(Date.now() - 2 * 86400000), start = new Date(Date.now() - 21 * 86400000);
      const fmt = (d: Date) => d.toISOString().slice(0,10).replaceAll("-", "");
      const q = new URLSearchParams({ parameters: "T2M,RH2M,WS10M,WD10M", community: "AG", latitude: String(data.lat), longitude: String(data.lng), start: fmt(start), end: fmt(end), format: "JSON" });
      return parsePower(await (await nasaFetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${q}`)).json());
    } catch { return { weather: null, date: null, error: "NASA POWER no responde. Clima de contingencia, no observado." }; }
  }));

export const getNasaSnapshot = createServerFn({ method: "GET" }).handler(async (): Promise<Snapshot> => {
  const key = process.env['NASA_FIRMS_MAP_KEY'];
  return cached(`snapshot:${key ? "configured" : "fallback"}`, 300000, async () => {
    const messages: string[] = [];
    const eonet = await nasaFetch("https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires&status=open&days=30&bbox=-82,-56,-34,13")
      .then(r => r.json()).then((p: { events: EonetEvent[] }) => parseEonet(p.events ?? []).filter(i => departmentAt(i.lat, i.lng))).catch(() => { messages.push("EONET temporalmente no disponible."); return []; });
    let firms: ReturnType<typeof parseFirms> = [];
    let firmsOk = false;
    if (key) {
      const results = await Promise.allSettled((["VIIRS_SNPP_NRT", "MODIS_NRT"] as const).map(async (source) => {
        const csv = await (await nasaFetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/${source}/${BOLIVIA_BBOX.join(",")}/2`)).text();
        return parseFirms(csv, source === "MODIS_NRT" ? "MODIS" : "VIIRS").filter(i => departmentAt(i.lat, i.lng));
      }));
      for (const r of results) { if (r.status === "fulfilled") { firms.push(...r.value); firmsOk = true; } else messages.push("Una fuente FIRMS no está disponible. Se mantienen las otras fuentes."); }
    } else messages.push("FIRMS requiere NASA_FIRMS_MAP_KEY. Puedes guardarla en los secretos de Lovable Cloud; mientras tanto usamos EONET y contingencia.");
    const unique = [...new Map(firms.map(i => [i.id, i])).values()];
    const rawLive = [...unique, ...eonet];
    const { incidents: live, stats: harmonizationStats } = harmonizeHotspots(rawLive);
    const source = firmsOk ? "FIRMS" : eonet.length ? "EONET" : "Sin datos";
    if (source === "Sin datos") messages.push("NASA no reporta detecciones activas en Bolivia en este momento. No se muestran datos simulados; cero detecciones no significa ausencia de incendios.");
    if (harmonizationStats.dualConfirmedClusters > 0) {
      messages.push(`Motor de Armonización: ${harmonizationStats.dualConfirmedClusters} foco(s) corroborado(s) simultáneamente por MODIS y VIIRS.`);
    }
    messages.push("EONET: eventos abiertos con observaciones en los últimos 30 días, no inventario completo; cero eventos no significa ausencia de incendios. FIRMS: detecciones de 2 días, pendientes de verificación en campo.");
    return { incidents: live, source, messages, updated: new Date().toISOString(), firmsConfigured: Boolean(key), eonetCount: eonet.length, harmonizationStats };
  });
});

export const getGibsDates = createServerFn({ method: "GET" }).handler(async () => cached("gibs", 3600000, async () => {
  try {
    const xml = await (await nasaFetch("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml")).text();
    const find = (id: string) => {
      const block = xml.split(/<Layer>/).find(s => s.includes(`>${id}</ows:Identifier>`));
      return block?.match(/<Default>(\d{4}-\d{2}-\d{2})<\/Default>/)?.[1] ?? null;
    };
    return { viirs: find("VIIRS_SNPP_CorrectedReflectance_TrueColor"), viirsThermal: find("VIIRS_SNPP_Thermal_Anomalies_375m_All"), modis: find("MODIS_Terra_Thermal_Anomalies_All") };
  } catch { return { viirs: null, viirsThermal: null, modis: null }; }
}));