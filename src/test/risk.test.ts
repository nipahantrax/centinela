import { describe, expect, it } from "vitest";
import {
  ignitionRisk,
  riskLabel,
  WATER_RESOURCES,
  findNearestWaterResource,
  RECURRENCE_CLUSTERS,
  VEGETATION_ZONES,
} from "@/lib/centinela-data";
import {
  evaluateRule30_30_30,
  checkCellulosicIgnition,
  fireThermalCurve,
  calculateFireWaterRequirement,
  calculateIgnitionRiskScore,
  calculateTotalIgnitionRisk,
  CRITICAL_IGNITION_TEMP_C,
} from "@/lib/fire-indices";

describe("Ignition Risk and Fire Physics", () => {
  it("computes ignition risk: 32°C, 40 km/h, 15% HR is 85% Muy Alto", () => {
    expect(ignitionRisk(32, 40, 15)).toBe(85);
    expect(riskLabel(85).label).toBe("Muy Alto");
  });

  describe("La Regla del 30-30-30 (Wildland Fire Red Flag)", () => {
    it("triggers EMERGENCIA CRÍTICA when Temp > 30°C, Wind > 30 km/h, and RH < 30%", () => {
      const result = evaluateRule30_30_30(32, 36, 18);
      expect(result.active).toBe(true);
      expect(result.severity).toBe("EMERGENCIA CRÍTICA");
      expect(result.factors.tempMet).toBe(true);
      expect(result.factors.windMet).toBe(true);
      expect(result.factors.rhMet).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it("does not activate when one of the conditions is below threshold", () => {
      // Temp 28°C (<= 30), Wind 35 km/h, RH 20%
      const result = evaluateRule30_30_30(28, 35, 20);
      expect(result.active).toBe(false);
      expect(result.severity).toBe("ALERTA ELEVADA");
      expect(result.factors.tempMet).toBe(false);
      expect(result.factors.windMet).toBe(true);
      expect(result.factors.rhMet).toBe(true);
    });

    it("remains NORMAL under safe wet conditions", () => {
      const result = evaluateRule30_30_30(20, 15, 65);
      expect(result.active).toBe(false);
      expect(result.severity).toBe("NORMAL");
    });
  });

  describe("Cellulosic Ignition & Thermal Thresholds (300 °C / 572 °F)", () => {
    it("models spontaneous ignition at or above 300 °C", () => {
      expect(CRITICAL_IGNITION_TEMP_C).toBe(300);
      const ignition = checkCellulosicIgnition(300);
      expect(ignition.isIgnited).toBe(true);
      expect(ignition.pyrolysisPhase).toBe("IGNICIÓN ESPONTÁNEA");
      expect(ignition.hazardLevel).toBe("Combustión Activa");

      const above = checkCellulosicIgnition(450);
      expect(above.isIgnited).toBe(true);
    });

    it("models accelerated pyrolysis below 300 °C without open ignition", () => {
      const pyrolysis = checkCellulosicIgnition(240);
      expect(pyrolysis.isIgnited).toBe(false);
      expect(pyrolysis.pyrolysisPhase).toBe("Pirólisis Acelerada");
      expect(pyrolysis.hazardLevel).toBe("Crítico");
    });
  });

  describe("Active Fire Thermal Curve Scaling", () => {
    it("escalates between minute 3 and 4 in flashover regimes", () => {
      const min2 = fireThermalCurve(2, true);
      const min4 = fireThermalCurve(4, true);

      expect(min2.temperatureC).toBeLessThanOrEqual(250);
      expect(min4.temperatureC).toBeGreaterThanOrEqual(800);
      expect(min4.regime).toBe("Desarrollo / Flashover");
    });

    it("reaches crown fire levels (900 °C - 1,200 °C+) in open conifer/eucalyptus stands", () => {
      const openFire10 = fireThermalCurve(10, false);
      expect(openFire10.temperatureC).toBeGreaterThanOrEqual(950);
      expect(openFire10.regime).toBe("Copas / Flama Extrema");
      expect(openFire10.safeDistanceMeters).toBeGreaterThan(15);
    });
  });

  describe("Tactical Water Demand for Forest Brigades", () => {
    it("calculates attack flow (L/min) and tanker loads based on FRP and 30-30-30", () => {
      const regular = calculateFireWaterRequirement(30, 10, false);
      expect(regular.litersPerMinute).toBeGreaterThan(500);
      expect(regular.truckLoadsRequired).toBeGreaterThanOrEqual(3);

      // Rule 30-30-30 increases requirement due to accelerated evaporation
      const underRule30 = calculateFireWaterRequirement(30, 10, true);
      expect(underRule30.litersPerMinute).toBeGreaterThan(regular.litersPerMinute);
      expect(underRule30.totalWaterLiters).toBeGreaterThan(regular.totalWaterLiters);
    });
  });

  describe("Botanical Risk Modulation", () => {
    it("modulates ignition risk score with botanical multipliers", () => {
      const baseParams = { temp: 30, windKmH: 30, rh: 20, simultaneousHotspots: 2 };
      const scoreNeutral = calculateIgnitionRiskScore({ ...baseParams, botanicalMultiplier: 1.0 });
      const scoreEucalyptus = calculateIgnitionRiskScore({ ...baseParams, botanicalMultiplier: 1.6 });

      expect(scoreEucalyptus).toBeGreaterThan(scoreNeutral);
      expect(scoreEucalyptus).toBeLessThanOrEqual(100);
    });
  });

  describe("MÓDULO 1: Geospatial Water Resources & Routing", () => {
    it("indexes rivers, lagoons, and municipal tanks in Cochabamba", () => {
      expect(WATER_RESOURCES.length).toBeGreaterThanOrEqual(15);
      const rivers = WATER_RESOURCES.filter((w) => w.type === "rio");
      const lagoons = WATER_RESOURCES.filter((w) => w.type === "laguna");
      const tanks = WATER_RESOURCES.filter((w) => w.type === "tanque");

      expect(rivers.length).toBeGreaterThanOrEqual(5);
      expect(lagoons.length).toBeGreaterThanOrEqual(5);
      expect(tanks.length).toBeGreaterThanOrEqual(5);
    });

    it("finds the closest water source for any coordinate accurately", () => {
      // Near Taquiña: [-17.315, -66.195]
      const result = findNearestWaterResource(-17.318, -66.198);
      expect(result.resource.name).toContain("Taquiña");
      expect(result.distKm).toBeLessThan(2.0);
    });
  });

  describe("MÓDULO 2: Recurrence Clusters & Smart Cisterns", () => {
    it("defines high recurrence zones with suggested mobile cistern points", () => {
      expect(RECURRENCE_CLUSTERS.length).toBeGreaterThanOrEqual(3);
      for (const cluster of RECURRENCE_CLUSTERS) {
        expect(cluster.hotspotsCount).toBeGreaterThanOrEqual(3);
        expect(cluster.polygon.length).toBeGreaterThanOrEqual(4);
        expect(cluster.suggestedCistern.capacityLiters).toBeGreaterThanOrEqual(10000);
        expect(cluster.suggestedCistern.impactAdvice).toContain("primer ataque");
      }
    });
  });

  describe("MÓDULO 3: Vegetation & Flammability Zones", () => {
    it("classifies pyrophytic vegetation with correct multipliers", () => {
      expect(VEGETATION_ZONES.length).toBeGreaterThanOrEqual(4);

      const extreme = VEGETATION_ZONES.find((z) => z.fuelClassification.includes("1.35x"));
      expect(extreme?.multiplier).toBe(1.35);
      expect(extreme?.dominantSpecies).toContain("Eucalyptus");

      const sernap = VEGETATION_ZONES.find((z) => z.isProtected);
      expect(sernap?.dominantSpecies).toContain("Polylepis");
      expect(sernap?.fuelClassification).toContain("SERNAP");
    });
  });

  describe("MÓDULO 4: Integrated Super-Predictive Risk Algorithm", () => {
    it("combines 30-30-30 weather, botanical factor, cellulosic threshold and recurrence cluster", () => {
      const result = calculateTotalIgnitionRisk({
        tempC: 32,
        windKmh: 36,
        rhPct: 15,
        vegetationMultiplier: 1.35,
        thermalAnomalyTempC: 320,
        isHotspotCluster: true,
      });

      expect(result.totalRiskPct).toBeGreaterThanOrEqual(85);
      expect(result.riskLevel).toBe("Crítico / Extremo");
      expect(result.severityColor).toBe("#ef4444");
      expect(result.breakdown.cellulosicBonusPct).toBe(25);
      expect(result.breakdown.clusterBonusPct).toBe(12);
      expect(result.breakdown.vegetationMultiplier).toBe(1.35);
      expect(result.breakdown.explanation).toContain("Riesgo consolidado");
    });

    it("evaluates mild wet conditions as Bajo without bonuses", () => {
      const mild = calculateTotalIgnitionRisk({
        tempC: 16,
        windKmh: 12,
        rhPct: 60,
        vegetationMultiplier: 1.0,
      });

      expect(mild.totalRiskPct).toBeLessThan(40);
      expect(mild.riskLevel).toBe("Bajo");
      expect(mild.breakdown.cellulosicBonusPct).toBe(0);
      expect(mild.breakdown.clusterBonusPct).toBe(0);
    });
  });
});
