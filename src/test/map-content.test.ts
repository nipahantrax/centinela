import { describe, expect, it } from "vitest";
import {
  escapeMapText,
  COCHABAMBA_STATS_2026,
  buildHotspotPopupHtml,
  buildCisternPopupHtml,
  buildHumanRiskPopupHtml,
} from "@/lib/map-content";
import { NODES, BOTANICAL_CATALOG, getBotanicalProfile, HUMAN_RISK_POINTS } from "@/lib/centinela-data";
import { liveIncident } from "@/lib/nasa-data";

describe("Map Content & Territorial Validation (Cochabamba)", () => {
  describe("Security: Untrusted map labels", () => {
    it("prevents arbitrary string injection in map popups", () => {
      expect(escapeMapText('<img src=x onerror="alert(1)">')).toBe(
        "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
      );
    });
  });

  describe("Coverage of the 11 Municipalities of Tunari & Metropolitan Axis", () => {
    it("contains all 11 official municipalities with nodes and cistern staging points", () => {
      const requiredMunicipalities = [
        "Cercado",
        "Sacaba",
        "Quillacollo",
        "Tiquipaya",
        "Colcapirhua",
        "Vinto",
        "Sipe Sipe",
        "Colomi",
        "Villa Tunari",
        "Tapacarí",
        "Morochata",
      ];

      expect(NODES).toHaveLength(11);

      requiredMunicipalities.forEach((muni) => {
        const found = NODES.find((n) => n.municipality.toLowerCase() === muni.toLowerCase());
        expect(found).toBeDefined();
        expect(found?.cisternPoint.capacityLiters).toBeGreaterThanOrEqual(10000);
        expect(found?.botany.dominantSpecies.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Pyrogenic Botany and Ecological Floors", () => {
    it("contains all 4 botanical groups including protected native species", () => {
      const groups = new Set(BOTANICAL_CATALOG.map((s) => s.group));
      expect(groups.has(1)).toBe(true); // Especies introducidas
      expect(groups.has(2)).toBe(true); // Pastizales / ichu (90%)
      expect(groups.has(3)).toBe(true); // Nativas vulnerables
      expect(groups.has(4)).toBe(true); // Transición trópico

      // Especies clave
      const kewina = BOTANICAL_CATALOG.find((s) => s.id === "kewina");
      expect(kewina?.isProtected).toBe(true);
      expect(kewina?.scientificName).toBe("Polylepis spp.");

      const eucalipto = BOTANICAL_CATALOG.find((s) => s.id === "eucalipto");
      expect(eucalipto?.riskMultiplier).toBe(1.6);

      const pino = BOTANICAL_CATALOG.find((s) => s.id === "pino");
      expect(pino?.riskMultiplier).toBe(1.5);

      const ichu = BOTANICAL_CATALOG.find((s) => s.id === "ichu");
      expect(ichu?.group).toBe(2);
    });

    it("generates botanical profiles with conservation alerts for protected zones", () => {
      const tiquipayaProfile = getBotanicalProfile("Tiquipaya");
      expect(tiquipayaProfile.overallMultiplier).toBeGreaterThanOrEqual(1.4);
      expect(tiquipayaProfile.advisory).toContain("especies vulnerables");
    });
  });

  describe("Cochabamba 2026 Official Fire Statistics", () => {
    it("reflects 90% grasslands and 10% forest split, plus +180% 2026 fire increase", () => {
      expect(COCHABAMBA_STATS_2026.burnedAreaGrasslandsPercent).toBe(90);
      expect(COCHABAMBA_STATS_2026.burnedAreaForestsPercent).toBe(10);
      expect(COCHABAMBA_STATS_2026.fireIncrease2026Percent).toBe(180);
      expect(COCHABAMBA_STATS_2026.boliviaBurnedHa2024).toBe(10770000);
      expect(COCHABAMBA_STATS_2026.boliviaBurnedHa2025).toBe(2600000);
      expect(COCHABAMBA_STATS_2026.responseTargetMinutes).toBe(18);
    });
  });

  describe("Popup Builders", () => {
    it("builds enriched HTML popups for hotspots with 30-30-30 and botany", () => {
      const incident = liveIncident(
        "INC-TEST",
        -17.31,
        -66.2,
        "2026-10-21T04:00:00Z",
        "MODIS+VIIRS armonizado",
        "Tiquipaya",
        45,
        96
      );
      incident.botany = getBotanicalProfile("Tiquipaya");

      const html = buildHotspotPopupHtml(incident, 32, 35, 18);
      expect(html).toContain("FUSIÓN NASA MODIS+VIIRS");
      expect(html).toContain("ALERTA 30-30-30 ACTIVA");
      expect(html).toContain("Demanda Hídrica");
    });

    it("builds popups for municipal cisterns and human risk points", () => {
      const node0 = NODES[0];
      const hr0 = HUMAN_RISK_POINTS[0];
      expect(node0).toBeDefined();
      expect(hr0).toBeDefined();

      if (node0 && hr0) {
        const cisternHtml = buildCisternPopupHtml(node0.cisternPoint);
        expect(cisternHtml).toContain("Cisterna Municipal");
        expect(cisternHtml).toContain("Litros");

        const hrHtml = buildHumanRiskPopupHtml(hr0);
        expect(hrHtml).toContain("msnm");
      }
    });
  });
});
