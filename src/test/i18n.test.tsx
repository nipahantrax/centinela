import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import {
  LANGUAGES,
  TRANSLATIONS,
  I18nProvider,
  useI18n,
  type Language,
} from "@/lib/i18n";

describe("i18n Multi-language System (ES, QU, EN)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("LANGUAGES catalog and Language type", () => {
    it("contains exactly 3 official languages: ES, QU, EN", () => {
      expect(LANGUAGES).toHaveLength(3);
      const codes = LANGUAGES.map((l) => l.code);
      expect(codes).toEqual(["es", "qu", "en"]);
    });

    it("does NOT contain Portuguese (pt) or French (fr)", () => {
      const codes = LANGUAGES.map((l) => l.code) as string[];
      expect(codes).not.toContain("pt");
      expect(codes).not.toContain("fr");
      expect(codes).not.toContain("de");
    });

    it("has correct flags and descriptive names", () => {
      const es = LANGUAGES.find((l) => l.code === "es");
      const qu = LANGUAGES.find((l) => l.code === "qu");
      const en = LANGUAGES.find((l) => l.code === "en");

      expect(es?.flag).toBe("🇪🇸");
      expect(qu?.flag).toBe("🏔️");
      expect(qu?.nativeName).toBe("Quechua");
      expect(en?.flag).toBe("🇺🇸");
    });
  });

  describe("TRANSLATIONS Dictionary Completeness", () => {
    it("has complete dictionaries for es, qu and en", () => {
      expect(TRANSLATIONS.es).toBeDefined();
      expect(TRANSLATIONS.qu).toBeDefined();
      expect(TRANSLATIONS.en).toBeDefined();
    });

    it("contains core tactical keys in all three languages", () => {
      const requiredKeys = [
        "modePreventive",
        "modeCombat",
        "dispatchWhatsApp",
        "copyIcs209",
        "navTactical",
        "navDashboard",
        "navMobile",
        "navAlerts",
        "navReports",
        "navProject",
        "rule303030Active",
        "layerWater",
        "layerVegetation",
        "layerCisterns",
      ];

      for (const key of requiredKeys) {
        expect(TRANSLATIONS.es[key], `Missing key ${key} in ES`).toBeTruthy();
        expect(TRANSLATIONS.qu[key], `Missing key ${key} in QU`).toBeTruthy();
        expect(TRANSLATIONS.en[key], `Missing key ${key} in EN`).toBeTruthy();
      }
    });

    it("uses authentic Bolivian Quechua terms for wildfire management", () => {
      expect(TRANSLATIONS.qu["modePreventive"]).toContain("HARK'AY");
      expect(TRANSLATIONS.qu["modeCombat"]).toContain("NINA THASNUY");
      expect(TRANSLATIONS.qu["layerWater"]).toContain("Mayukuna");
      expect(TRANSLATIONS.qu["copyIcs209"]).toContain("ICS-209");
    });
  });

  describe("I18nProvider and useI18n Hook", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <I18nProvider>{children}</I18nProvider>
    );

    it("defaults to Spanish (es) when localStorage is empty", () => {
      const { result } = renderHook(() => useI18n(), { wrapper });
      expect(result.current.lang).toBe("es");
      expect(result.current.t("modePreventive")).toBe(
        "🛡️ MODO 1: PREVENCIÓN E IGNICIÓN (ANTES DEL FUEGO)"
      );
    });

    it("switches reactively to Quechua (qu) and persists in centinela_lang", () => {
      const { result } = renderHook(() => useI18n(), { wrapper });

      act(() => {
        result.current.setLang("qu");
      });

      expect(result.current.lang).toBe("qu");
      expect(result.current.t("modePreventive")).toContain("HARK'AY");
      expect(result.current.t("dispatchWhatsApp")).toContain("WhatsApp");
      expect(localStorage.getItem("centinela_lang")).toBe("qu");
    });

    it("switches reactively to English (en) and persists in centinela_lang", () => {
      const { result } = renderHook(() => useI18n(), { wrapper });

      act(() => {
        result.current.setLang("en");
      });

      expect(result.current.lang).toBe("en");
      expect(result.current.t("modePreventive")).toBe(
        "🛡️ MODE 1: PREVENTION & IGNITION (BEFORE FIRE)"
      );
      expect(result.current.t("modeCombat")).toBe(
        "🚨 MODE 2: INTERCEPTION & COMBAT (MODIS + VIIRS)"
      );
      expect(localStorage.getItem("centinela_lang")).toBe("en");
    });

    it("falls back safely to key or Spanish if key is not found", () => {
      const { result } = renderHook(() => useI18n(), { wrapper });
      const nonExistentKey = "random_non_existent_key_xyz";
      expect(result.current.t(nonExistentKey)).toBe(nonExistentKey);
    });

    it("loads saved language from centinela_lang on mount", () => {
      localStorage.setItem("centinela_lang", "qu");
      const { result } = renderHook(() => useI18n(), { wrapper });
      expect(result.current.lang).toBe("qu");
    });
  });
});
