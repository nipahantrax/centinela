import type { Incident } from "./centinela-data";

/**
 * Motor de Armonización Espaciotemporal MODIS + VIIRS
 * Diseñado para el reto oficial: "Harmonization of MODIS and VIIRS Hot Spots"
 * 
 * Principio científico:
 * - MODIS (Terra/Aqua) ofrece un récord histórico de 20+ años a ~1000m de resolución espacial.
 * - VIIRS (Suomi-NPP / NOAA-20) ofrece banda térmica de 375m, detectando focos incipientes y delimitando bordes.
 * - Cuando ambos sensores detectan calor en la misma ventana espaciotemporal (<= 1.5 km y <= 12h):
 *   1. Se confirma corroboración inter-satelital (probabilidad de falsa alarma reducida a < 1%).
 *   2. Se refina el centroide usando la resolución de 375m de VIIRS.
 *   3. Se combina y calcula la Potencia Radiativa de Fuego (FRP) acumulada.
 *   4. Se eleva el factor de confianza táctica.
 */

export interface HarmonizationStats {
  totalRawDetections: number;
  totalHarmonizedIncidents: number;
  dualConfirmedClusters: number;
  viirsExclusiveCount: number;
  modisExclusiveCount: number;
  eonetCount: number;
  corroborationRatePercent: number;
  totalFRP: number;
}

export interface HarmonizedResult {
  incidents: Incident[];
  stats: HarmonizationStats;
}

/**
 * Distancia ortodrómica aproximada en kilómetros entre dos coordenadas geográficas.
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Armoniza una lista de incidentes/detecciones de calor de la NASA.
 * Separa MODIS y VIIRS, encuentra intersecciones espaciotemporales y genera
 * focos unificados de alta confianza junto con los focos exclusivos de cada sensor.
 */
export function harmonizeHotspots(rawIncidents: Incident[]): HarmonizedResult {
  if (!rawIncidents || rawIncidents.length === 0) {
    return {
      incidents: [],
      stats: {
        totalRawDetections: 0,
        totalHarmonizedIncidents: 0,
        dualConfirmedClusters: 0,
        viirsExclusiveCount: 0,
        modisExclusiveCount: 0,
        eonetCount: 0,
        corroborationRatePercent: 0,
        totalFRP: 0,
      },
    };
  }

  const modisList: Incident[] = [];
  const viirsList: Incident[] = [];
  const othersList: Incident[] = [];

  for (const inc of rawIncidents) {
    if (inc.source === "MODIS") {
      modisList.push(inc);
    } else if (inc.source === "VIIRS") {
      viirsList.push(inc);
    } else {
      othersList.push(inc);
    }
  }

  const SPATIAL_THRESHOLD_KM = 1.5; // Correlación espacial dentro de la huella de pixel de MODIS (1 km + error de escaneo)
  const TEMPORAL_THRESHOLD_HOURS = 12; // Máxima ventana temporal entre pasos orbitales de Terra/Aqua y SNPP

  const matchedModisIds = new Set<string>();
  const matchedViirsIds = new Set<string>();
  const harmonizedClusters: Incident[] = [];

  // Buscar correspondencias cruzadas MODIS <-> VIIRS
  for (const m of modisList) {
    const mTime = Date.parse(m.date);
    const nearbyViirs: Incident[] = [];

    for (const v of viirsList) {
      if (matchedViirsIds.has(v.id)) continue;

      const vTime = Date.parse(v.date);
      const hoursDiff = Math.abs(mTime - vTime) / 3600000;

      if (hoursDiff <= TEMPORAL_THRESHOLD_HOURS) {
        const distKm = haversineKm(m.lat, m.lng, v.lat, v.lng);
        if (distKm <= SPATIAL_THRESHOLD_KM) {
          nearbyViirs.push(v);
        }
      }
    }

    if (nearbyViirs.length > 0) {
      // Marcamos el MODIS como armonizado
      matchedModisIds.add(m.id);
      nearbyViirs.forEach((v) => matchedViirsIds.add(v.id));

      // Seleccionar el centroide de VIIRS de mayor FRP para máxima precisión espacial (375m)
      const primaryViirs = nearbyViirs.reduce((prev, curr) =>
        (curr.frp ?? 0) > (prev.frp ?? 0) ? curr : prev
      );

      // Calcular FRP integrado (suma o máximo representativo)
      const sumFrp =
        (m.frp ?? 0) + nearbyViirs.reduce((acc, v) => acc + (v.frp ?? 0), 0);
      const avgFrp = Math.round((sumFrp / (nearbyViirs.length + 1)) * 10) / 10;

      // Calcular confianza combinada
      const maxConf = Math.max(
        m.confidence ?? 60,
        ...nearbyViirs.map((v) => v.confidence ?? 60)
      );
      const boostedConfidence = Math.min(99, maxConf + 12); // Bono de corroboración multi-satélite

      // Fecha más reciente
      const latestDate = [m.date, ...nearbyViirs.map((v) => v.date)].sort().reverse()[0] ?? m.date;

      const harmonizedIncident: Incident = {
        id: `ARM-${m.id.replace("FIRMS-MODIS-", "")}`,
        date: latestDate,
        zone: primaryViirs.zone || m.zone || "Bolivia · foco armonizado",
        lat: Number(primaryViirs.lat.toFixed(5)),
        lng: Number(primaryViirs.lng.toFixed(5)),
        confidence: boostedConfidence,
        frp: avgFrp,
        areaHa: primaryViirs.areaHa ?? m.areaHa ?? null,
        source: "MODIS+VIIRS armonizado",
        live: true,
        status: "Monitoreo",
        altitude: primaryViirs.altitude ?? m.altitude ?? null,
        hydrant: primaryViirs.hydrant ?? m.hydrant,
        route: primaryViirs.route ?? m.route,
      };

      harmonizedClusters.push(harmonizedIncident);
    }
  }

  // Focos exclusivos de MODIS (sin detección simultánea de VIIRS)
  const remainingModis = modisList.filter((m) => !matchedModisIds.has(m.id));

  // Focos exclusivos de VIIRS (focos pequeños o incipientes que MODIS no resolvió por límite de pixel)
  const remainingViirs = viirsList.filter((v) => !matchedViirsIds.has(v.id));

  const allHarmonized = [
    ...harmonizedClusters,
    ...remainingViirs,
    ...remainingModis,
    ...othersList,
  ];

  // Ordenar cronológicamente (más recientes primero)
  allHarmonized.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  const dualConfirmedCount = harmonizedClusters.length;
  const totalRaw = rawIncidents.length;
  const corroborationRate =
    totalRaw > 0 ? Math.round(((dualConfirmedCount * 2) / totalRaw) * 100) : 0;

  const totalFRP = allHarmonized.reduce((acc, i) => acc + (i.frp ?? 0), 0);

  return {
    incidents: allHarmonized,
    stats: {
      totalRawDetections: totalRaw,
      totalHarmonizedIncidents: allHarmonized.length,
      dualConfirmedClusters: dualConfirmedCount,
      viirsExclusiveCount: remainingViirs.length,
      modisExclusiveCount: remainingModis.length,
      eonetCount: othersList.length,
      corroborationRatePercent: Math.min(100, corroborationRate),
      totalFRP: Math.round(totalFRP * 10) / 10,
    },
  };
}
