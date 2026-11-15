import { describe, expect, it } from "vitest";
import {
  clusterHotspots,
  buildWebGLHotspotBuffer,
  buildWebGLWindParticles,
  latLngToPixel,
} from "@/lib/webgl-clustering";
import type { Incident } from "@/lib/centinela-data";
import { getBotanicalProfile } from "@/lib/centinela-data";

const mockIncidents: Incident[] = [
  {
    id: "INC-TEST-001",
    lat: -17.295,
    lng: -66.238,
    date: "2026-10-21T02:00:00Z",
    source: "MODIS+VIIRS armonizado",
    zone: "Tiquipaya · Parque Tunari",
    frp: 45.0,
    confidence: 96,
    areaHa: 20,
    altitude: 3400,
    status: "Activo",
    hydrant: { name: "Represa Wara Wara", distKm: 3.2 },
    route: { state: "Ruta Habilitada", distKm: 15, etaMin: 25 },
    botany: getBotanicalProfile("Tiquipaya"),
  },
  {
    id: "INC-TEST-002",
    lat: -17.297,
    lng: -66.239,
    date: "2026-10-21T02:15:00Z",
    source: "VIIRS",
    zone: "Tiquipaya · Parque Tunari",
    frp: 32.0,
    confidence: 85,
    areaHa: 10,
    altitude: 3350,
    status: "Activo",
    hydrant: { name: "Represa Wara Wara", distKm: 3.0 },
    route: { state: "Ruta Habilitada", distKm: 14, etaMin: 24 },
    botany: getBotanicalProfile("Tiquipaya"),
  },
  {
    id: "INC-TEST-003",
    lat: -17.452,
    lng: -66.365,
    date: "2026-10-21T03:00:00Z",
    source: "MODIS",
    zone: "Sipe Sipe",
    frp: 12.0,
    confidence: 60,
    areaHa: 5,
    altitude: 2700,
    status: "Monitoreo",
    hydrant: { name: "Tinglado Sipe Sipe", distKm: 1.5 },
    route: { state: "Ruta Habilitada", distKm: 5, etaMin: 10 },
    botany: getBotanicalProfile("Sipe Sipe"),
  },
];

describe("CENTINELA · WebGL Clustering Engine", () => {
  it("converts lat/lng to pixel space consistently with Web Mercator", () => {
    const [px1, py1] = latLngToPixel(-17.295, -66.238, 10);
    const [px2, py2] = latLngToPixel(-17.295, -66.238, 11);
    expect(px1).toBeGreaterThan(0);
    expect(py1).toBeGreaterThan(0);
    // En un zoom mayor, la coordenada de pixel se duplica
    expect(Math.round(px2 / px1)).toBe(2);
  });

  it("clusters nearby hotspots at macro/regional zoom levels (zoom <= 11)", () => {
    const clusters = clusterHotspots(mockIncidents, 8);
    expect(clusters.length).toBeLessThan(mockIncidents.length);

    // Los dos focos cercanos de Tiquipaya deben estar agrupados en un solo cluster
    const tiquipayaCluster = clusters.find((c) => c.incidents.some((i) => i.id === "INC-TEST-001"));
    expect(tiquipayaCluster).toBeDefined();
    expect(tiquipayaCluster?.totalHotspots).toBeGreaterThanOrEqual(2);
    expect(tiquipayaCluster?.sumFRP).toBe(77.0);
    expect(tiquipayaCluster?.maxFRP).toBe(45.0);
    expect(tiquipayaCluster?.harmonizedCount).toBeGreaterThanOrEqual(1);
    expect(tiquipayaCluster?.dominantRiskLevel).toBe("CRITICO");
    expect(tiquipayaCluster?.hasRule30Risk).toBe(true);
    expect(tiquipayaCluster?.hasExplosiveVegetation).toBe(true);
  });

  it("unclusters cleanly into individual 375m hotspots at tactical zoom (zoom >= 12)", () => {
    const tacticalHotspots = clusterHotspots(mockIncidents, 13);
    // A zoom táctico, cada incidente se representa como su propio punto individual
    expect(tacticalHotspots).toHaveLength(mockIncidents.length);
    for (const h of tacticalHotspots) {
      expect(h.totalHotspots).toBe(1);
      expect(h.isSingleHotspot).toBe(true);
      expect(h.incidents).toHaveLength(1);
    }
  });

  it("generates a Float32Array buffer for WebGL shaders with correct stride", () => {
    const clusters = clusterHotspots(mockIncidents, 10);
    const { buffer, count } = buildWebGLHotspotBuffer(clusters);

    expect(count).toBe(clusters.length);
    expect(buffer).toBeInstanceOf(Float32Array);
    // Cada punto ocupa 6 floats
    expect(buffer.length).toBe(clusters.length * 6);

    // Validar primer punto
    expect(buffer[0]).toBeCloseTo(clusters[0]!.lat, 3);
    expect(buffer[1]).toBeCloseTo(clusters[0]!.lng, 3);
    expect(buffer[2]).toBeGreaterThan(0); // radio
  });

  it("generates wind particle flow buffer with correct velocity vector", () => {
    const particles = buildWebGLWindParticles(-17.31, -66.2, 38, 45, 100);
    expect(particles).toBeInstanceOf(Float32Array);
    expect(particles.length).toBe(100 * 6); // stride 6

    // Verificar que las velocidades no sean nulas
    const vx = particles[2];
    const vy = particles[3];
    expect(vx).toBeDefined();
    expect(vy).toBeDefined();
    expect(Math.hypot(vx ?? 0, vy ?? 0)).toBeGreaterThan(0);
  });
});
