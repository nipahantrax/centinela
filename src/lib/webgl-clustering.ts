import type { Incident } from "./centinela-data";

/**
 * CENTINELA · Motor de Clustering Espaciotemporal Jerárquico y Radiométrico
 * Optimizado en memoria (Float32Array) para renderizado WebGL acelerado por GPU
 * 
 * Reglas de Zoom:
 * - Macro / Departamental / Nacional (zoom <= 11): Agrupación en Clústeres Térmicos Inteligentes
 * - Micro / Táctico Operativo Tunari (zoom >= 12): Desagrupación a Eventos Térmicos a 375m
 */

export interface ClusterBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface HotspotCluster {
  id: string;
  lat: number;
  lng: number;
  totalHotspots: number;
  harmonizedCount: number;
  maxFRP: number;
  sumFRP: number;
  maxTempKelvin: number;
  dominantRiskLevel: "CRITICO" | "ALTO" | "MODERADO";
  hasRule30Risk: boolean;
  hasExplosiveVegetation: boolean; // Pinos / Eucaliptos (Riesgo 1.5x - 1.6x)
  hasProtectedVegetation: boolean; // Kewiñas / Áreas de conservación
  bounds: ClusterBounds;
  incidents: Incident[];
  isSingleHotspot: boolean;
}

export interface ClusteringOptions {
  clusterRadiusPx?: number; // Radio de búsqueda en píxeles (default: 64px)
  maxZoomCluster?: number;  // Nivel de zoom a partir del cual se desagrega (default: 12)
}

/**
 * Convierte latitud / longitud a coordenadas de píxel de proyección Web Mercator en un zoom dado.
 */
export function latLngToPixel(lat: number, lng: number, zoom: number): [number, number] {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return [x, y];
}

/**
 * Agrupa incidentes térmicos jerárquicamente según el nivel de zoom y proximidad espacial.
 */
export function clusterHotspots(
  incidents: Incident[],
  zoom: number,
  options: ClusteringOptions = {}
): HotspotCluster[] {
  if (incidents.length === 0) return [];

  const maxZoom = options.maxZoomCluster ?? 12;
  const radiusPx = options.clusterRadiusPx ?? 64;

  // Si estamos en zoom táctico (>= 12), desagrupar completamente a nivel de foco individual (375m)
  if (zoom >= maxZoom) {
    return incidents.map((inc) => {
      const isHarmonized = inc.source === "MODIS+VIIRS armonizado" || (inc.confidence ?? 0) >= 90;
      const isCritical = (inc.frp ?? 0) >= 30;
      const isExplosive = inc.botany?.dominantSpecies.some((s) => s.id === "pino" || s.id === "eucalipto") ?? false;
      const isProtected = inc.botany?.dominantSpecies.some((s) => s.id === "kewina" || s.isProtected) ?? false;
      const tempK = 300 + (inc.frp ?? 10) * 8.5; // Estimación radiométrica de temperatura de brillo

      return {
        id: `single-${inc.id}`,
        lat: inc.lat,
        lng: inc.lng,
        totalHotspots: 1,
        harmonizedCount: isHarmonized ? 1 : 0,
        maxFRP: inc.frp ?? 0,
        sumFRP: inc.frp ?? 0,
        maxTempKelvin: tempK,
        dominantRiskLevel: isCritical || isExplosive ? "CRITICO" : (inc.frp ?? 0) >= 15 ? "ALTO" : "MODERADO",
        hasRule30Risk: isCritical,
        hasExplosiveVegetation: isExplosive,
        hasProtectedVegetation: isProtected,
        bounds: {
          minLat: inc.lat - 0.003,
          maxLat: inc.lat + 0.003,
          minLng: inc.lng - 0.003,
          maxLng: inc.lng + 0.003,
        },
        incidents: [inc],
        isSingleHotspot: true,
      };
    });
  }

  // Clustering espacial acelerado por Spatial Grid Hash
  const cellSize = radiusPx;
  const grid = new Map<string, Incident[]>();

  for (const inc of incidents) {
    const [px, py] = latLngToPixel(inc.lat, inc.lng, zoom);
    const cellX = Math.floor(px / cellSize);
    const cellY = Math.floor(py / cellSize);
    const key = `${cellX}:${cellY}`;

    const cell = grid.get(key);
    if (cell) {
      cell.push(inc);
    } else {
      grid.set(key, [inc]);
    }
  }

  const clusters: HotspotCluster[] = [];

  grid.forEach((cellIncidents, key) => {
    let sumLat = 0;
    let sumLng = 0;
    let sumWeight = 0;
    let harmonized = 0;
    let maxFRP = 0;
    let sumFRP = 0;
    let hasRule30 = false;
    let hasExplosive = false;
    let hasProtected = false;

    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;

    for (const inc of cellIncidents) {
      const weight = Math.max(1, inc.frp ?? 1);
      sumLat += inc.lat * weight;
      sumLng += inc.lng * weight;
      sumWeight += weight;

      const frpVal = inc.frp ?? 0;
      if (frpVal > maxFRP) maxFRP = frpVal;
      sumFRP += frpVal;

      if (inc.source === "MODIS+VIIRS armonizado" || (inc.confidence ?? 0) >= 90) {
        harmonized++;
      }
      if (frpVal >= 30) {
        hasRule30 = true;
      }
      if (inc.botany?.dominantSpecies.some((s) => s.id === "pino" || s.id === "eucalipto")) {
        hasExplosive = true;
      }
      if (inc.botany?.dominantSpecies.some((s) => s.id === "kewina" || s.isProtected)) {
        hasProtected = true;
      }

      if (inc.lat < minLat) minLat = inc.lat;
      if (inc.lat > maxLat) maxLat = inc.lat;
      if (inc.lng < minLng) minLng = inc.lng;
      if (inc.lng > maxLng) maxLng = inc.lng;
    }

    const centerLat = sumWeight > 0 ? sumLat / sumWeight : cellIncidents[0]?.lat ?? 0;
    const centerLng = sumWeight > 0 ? sumLng / sumWeight : cellIncidents[0]?.lng ?? 0;
    const maxTempKelvin = Math.round(300 + maxFRP * 8.5);

    let dominantRiskLevel: HotspotCluster["dominantRiskLevel"] = "MODERADO";
    if (hasRule30 || sumFRP >= 50 || hasExplosive) {
      dominantRiskLevel = "CRITICO";
    } else if (sumFRP >= 20 || harmonized > 0) {
      dominantRiskLevel = "ALTO";
    }

    clusters.push({
      id: `cluster-${key}-${cellIncidents.length}`,
      lat: centerLat,
      lng: centerLng,
      totalHotspots: cellIncidents.length,
      harmonizedCount: harmonized,
      maxFRP: Math.round(maxFRP * 10) / 10,
      sumFRP: Math.round(sumFRP * 10) / 10,
      maxTempKelvin,
      dominantRiskLevel,
      hasRule30Risk: hasRule30,
      hasExplosiveVegetation: hasExplosive,
      hasProtectedVegetation: hasProtected,
      bounds: {
        minLat: minLat - 0.005,
        maxLat: maxLat + 0.005,
        minLng: minLng - 0.005,
        maxLng: maxLng + 0.005,
      },
      incidents: cellIncidents,
      isSingleHotspot: cellIncidents.length === 1,
    });
  });

  return clusters;
}

/**
 * Empaqueta un arreglo de clústeres o focos en un buffer de memoria Float32Array
 * optimizado para ser consumido directamente por shaders de GPU en WebGL.
 * Cada punto ocupa 6 floats: [lat, lng, radius, frpNormalized, isHarmonized, isCritical]
 */
export function buildWebGLHotspotBuffer(clusters: HotspotCluster[]): {
  buffer: Float32Array;
  count: number;
} {
  const stride = 6;
  const buffer = new Float32Array(clusters.length * stride);

  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i]!;
    const offset = i * stride;
    buffer[offset + 0] = c.lat;
    buffer[offset + 1] = c.lng;
    buffer[offset + 2] = Math.min(48, Math.max(8, c.totalHotspots * 3 + 6));
    buffer[offset + 3] = Math.min(1.0, c.maxFRP / 80);
    buffer[offset + 4] = c.harmonizedCount > 0 ? 1.0 : 0.0;
    buffer[offset + 5] = c.dominantRiskLevel === "CRITICO" ? 1.0 : 0.0;
  }

  return { buffer, count: clusters.length };
}

/**
 * Genera partículas de flujo de viento en memoria Float32Array para el overlay WebGL.
 * Cada partícula almacena: [x, y, vx, vy, life, maxLife]
 */
export function buildWebGLWindParticles(
  centerLat: number,
  centerLng: number,
  windKmH: number,
  windDeg: number,
  count = 250
): Float32Array {
  const rad = ((windDeg + 180) % 360) * (Math.PI / 180); // Dirección hacia donde sopla
  const speed = Math.max(0.001, (windKmH / 100) * 0.008);
  const vx = Math.sin(rad) * speed;
  const vy = Math.cos(rad) * speed;

  const stride = 6;
  const particles = new Float32Array(count * stride);

  for (let i = 0; i < count; i++) {
    const offset = i * stride;
    // Dispersión aleatoria alrededor del nodo
    particles[offset + 0] = centerLng + (Math.random() - 0.5) * 0.45;
    particles[offset + 1] = centerLat + (Math.random() - 0.5) * 0.35;
    particles[offset + 2] = vx * (0.8 + Math.random() * 0.4);
    particles[offset + 3] = vy * (0.8 + Math.random() * 0.4);
    particles[offset + 4] = Math.random() * 60; // Vida actual en frames
    particles[offset + 5] = 60 + Math.random() * 60; // Vida máxima
  }

  return particles;
}
