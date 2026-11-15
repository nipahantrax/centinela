import { describe, expect, it } from "vitest";
import { harmonizeHotspots, kelvinToCelsius, haversineKm } from "@/lib/harmonization";
import { calculateAngstromIndex, classifyFrp, getWindCompassInfo } from "@/lib/fire-indices";
import { liveIncident } from "@/lib/nasa-data";

describe("MODIS & VIIRS Harmonization Engine (NASA Challenge)", () => {
  it("converts radiometric Kelvin brightness to Celsius correctly", () => {
    // 300 K = 26.85 °C -> 26.9 °C
    expect(kelvinToCelsius(300)).toBeCloseTo(26.9, 1);
    // 373.15 K = 100 °C
    expect(kelvinToCelsius(373.15)).toBe(100);
  });

  it("calculates accurate geodetic Haversine distances in kilometers", () => {
    // ~1 km in latitude is approximately 0.009 degrees
    const d = haversineKm(-17.3100, -66.2000, -17.3190, -66.2000);
    expect(d).toBeCloseTo(1.0, 0);
  });

  it("harmonizes co-located MODIS (1000m) and VIIRS (375m) detections within 600m and 2 hours", () => {
    const modis = liveIncident(
      "FIRMS-MODIS-2026-10-21-0430",
      -17.3100,
      -66.2000,
      "2026-10-21T04:30:00Z",
      "MODIS",
      "Cochabamba",
      25.0,
      80
    );

    const viirs = liveIncident(
      "FIRMS-VIIRS-2026-10-21-0515", // 45 min de diferencia (< 2h)
      -17.3120, // ~250 metros de distancia (< 600m)
      -66.2010,
      "2026-10-21T05:15:00Z",
      "VIIRS",
      "Cochabamba",
      30.0,
      88
    );

    const result = harmonizeHotspots([modis, viirs]);

    expect(result.stats.dualConfirmedClusters).toBe(1);
    expect(result.stats.totalHarmonizedIncidents).toBe(1);
    expect(result.incidents[0]?.source).toBe("MODIS+VIIRS armonizado");
    // Centroide refinado a 375m por VIIRS
    expect(result.incidents[0]?.lat).toBe(-17.3120);
    // Confianza combinada elevada a > 90%
    expect(result.incidents[0]?.confidence).toBeGreaterThanOrEqual(92);
    // Reducción de falsos positivos
    expect(result.stats.falsePositiveReductionRate).toBeGreaterThanOrEqual(98);
  });

  it("does not merge detections that exceed the 600m or 2-hour thresholds", () => {
    const modis = liveIncident(
      "MODIS-FAR",
      -17.3100,
      -66.2000,
      "2026-10-21T04:30:00Z",
      "MODIS",
      "Cochabamba"
    );

    // Más de 2 km de distancia
    const viirsFar = liveIncident(
      "VIIRS-FAR",
      -17.3350,
      -66.2000,
      "2026-10-21T04:35:00Z",
      "VIIRS",
      "Cochabamba"
    );

    const result = harmonizeHotspots([modis, viirsFar]);

    expect(result.stats.dualConfirmedClusters).toBe(0);
    expect(result.stats.totalHarmonizedIncidents).toBe(2);
    expect(result.stats.modisExclusiveCount).toBe(1);
    expect(result.stats.viirsExclusiveCount).toBe(1);
  });

  it("keeps geographically separated detections as exclusive sensor incidents", () => {
    const modisNorth = liveIncident(
      "MODIS-N",
      -16.0000,
      -65.0000,
      "2026-10-21T04:30:00Z",
      "MODIS",
      "Beni"
    );

    const viirsSouth = liveIncident(
      "VIIRS-S",
      -19.0000,
      -63.0000,
      "2026-10-21T04:30:00Z",
      "VIIRS",
      "Santa Cruz"
    );

    const result = harmonizeHotspots([modisNorth, viirsSouth]);

    expect(result.stats.dualConfirmedClusters).toBe(0);
    expect(result.stats.totalHarmonizedIncidents).toBe(2);
    expect(result.stats.modisExclusiveCount).toBe(1);
    expect(result.stats.viirsExclusiveCount).toBe(1);
  });
});

describe("Fire Weather & Danger Indices", () => {
  it("evaluates Angstrom Index correctly", () => {
    // High heat (35°C), very dry (10% RH)
    const severe = calculateAngstromIndex(35, 10);
    expect(severe.index).toBeLessThan(2.0);
    expect(severe.label).toBe("Peligro Extremo");

    // Mild conditions (18°C, 65% RH)
    const mild = calculateAngstromIndex(18, 65);
    expect(mild.index).toBeGreaterThanOrEqual(4.0);
    expect(mild.label).toBe("Peligro Bajo");
  });

  it("classifies FRP thermal severity and calculates tactical water", () => {
    expect(classifyFrp(120).category).toBe("Crítica (Extrema)");
    expect(classifyFrp(120).recommendedWaterLiters).toBe(15000);

    expect(classifyFrp(60).category).toBe("Alta");
    expect(classifyFrp(30).category).toBe("Moderada");
    expect(classifyFrp(8).category).toBe("Baja");
  });

  it("calculates wind compass advance angle correctly", () => {
    // Wind from North (0° / 360°) blows toward South (180°)
    const north = getWindCompassInfo(0);
    expect(north.short).toBe("N");
    expect(north.advanceToward).toBe(180);

    // Wind from West (270°) blows toward East (90°)
    const west = getWindCompassInfo(270);
    expect(west.short).toBe("O");
    expect(west.advanceToward).toBe(90);
  });
});
