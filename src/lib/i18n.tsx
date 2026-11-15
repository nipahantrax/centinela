import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Language = "es" | "qu" | "en";

export interface LanguageInfo {
  code: Language;
  name: string;
  flag: string;
  nativeName: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: "es", name: "Español", nativeName: "Español", flag: "🇪🇸" },
  { code: "qu", name: "Runasimi", nativeName: "Quechua", flag: "🏔️" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
];

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  es: {
    // Brand & Header
    appName: "CENTINELA",
    subtitle: "Alerta Temprana Preventiva y Despacho Táctico",
    appSubtitle: "Alerta Temprana Preventiva y Despacho Táctico • Cochabamba, Bolivia",
    gamcTitle: "Gobierno Autónomo Municipal de Cochabamba · Parque Nacional Tunari",
    subgamc: "11 Municipios del Eje Metropolitano y Cordillera Tunari",
    systemActive: "SISTEMA ACTIVO — Monitoreo satelital en tiempo real",
    systemNotice: "SISTEMA CENTINELA · Mando Operativo GAMC: Monitoreo Satelital y Despacho Táctico de Emergencia · 11 Municipios Parque Nacional Tunari",
    modePreventive: "🛡️ MODO 1: PREVENCIÓN E IGNICIÓN (ANTES DEL FUEGO)",
    modeCombat: "🚨 MODO 2: INTERCEPCIÓN Y COMBATE (MODIS + VIIRS)",
    simulateEvent: "🔥 SIMULAR EVENTO",
    liveSatelliteData: "Datos Satelitales en Vivo",
    simulationTunari: "Simulación Crisis Tunari",

    // Navegación (Desktop & MobileNav)
    navTactical: "Mando Táctico",
    navDashboard: "Mando Táctico",
    navMobile: "Mapa Brigadista",
    navAlerts: "Alertas & SOS",
    navReports: "Reportes & SIG",
    navProject: "Arquitectura & GAMC",
    navPublic: "Acceso Ciudadano",
    back: "Volver",

    // Columna Izquierda: Riesgo, Clima y Regla 30-30-30
    ignitionRiskTitle: "ÍNDICE DE RIESGO DE IGNICIÓN",
    riskLow: "BAJO (ESTABLE)",
    riskModerate: "MODERADO (PRECAUCIÓN)",
    riskHigh: "MUY ALTO (CRÍTICO)",
    riskGauge: "Riesgo de Ignición",
    whyRiskTitle: "¿Por qué el riesgo hoy es del",
    rule30Title: "Regla 30-30-30",
    rule303030Title: "Motor Preventivo • Regla 30-30-30",
    rule303030Active: "🚨 ALERTA ROJA PREVENTIVA 30-30-30 ACTIVA",
    rule303030Safe: "BAJO UMBRAL CRÍTICO",
    celluloseThreshold: "🔬 Umbral Termodinámico de Celulosa: 300 °C (572 °F)",
    tempLabel: "Temperatura",
    temp: "Temp",
    windLabel: "Viento",
    wind: "Viento",
    humidityLabel: "Humedad",
    humidity: "Humedad Relativa",
    updateSensorsBtn: "ACTUALIZAR SENSORES NASA",
    refreshNasa: "Actualizar sensores NASA",
    vegetationCardTitle: "🌲 Índice de Combustible Vegetal Local",

    // Ribbon y Municipios
    allMunicipalities: "Valle Central & Tunari (11 Municipios)",
    waterReservesTotal: "162.000 L reserva hídrica",
    activeHotspots: "focos monitoreados",
    cisternPoint: "Cisterna GAMC",
    fuelModel: "Combustible",
    etaEngine: "ETA Autobomba: ≤ 25 min",

    // Mapa, Capas y Leyenda
    layerWater: "💧 Ríos/Tanques",
    layerVegetation: "🌲 Vegetación",
    layerCisterns: "🚛 Cisternas",
    wmtsLayers: "Capas WMTS",
    exportGeoJson: "GeoJSON SIG",
    exportCsv: "CSV Auditoría",
    legendTitle: "Guía Rápida: ¿Qué veo en el mapa?",
    legendPrevTitle: "1. Zona Ámbar: Alerta Preventiva (Sin fuego)",
    legendPrevDesc: "Zonas con Regla 30-30-30 activa. Alto riesgo de chispa y biomasa seca.",
    legendInitialTitle: "2. Marcador Naranja: Anomalía Térmica Inicial",
    legendInitialDesc: "Calor superficial detectado acercándose a 300 °C. Requiere inspección.",
    legendActiveTitle: "3. Marcador Rojo: Foco Activo Confirmado",
    legendActiveDesc: "Fuego corroborado MODIS + VIIRS (375m) con cono de propagación de viento.",
    legendWaterTitle: "4. Marcador Azul: Hidrantes, Ríos y Cisternas",
    legendWaterDesc: "Puntos de abastecimiento hídrico y rutas transitables de intervención.",

    // Operaciones, Inspector & Despacho
    incidentTitle: "Incidentes Detectados",
    tacticalIncident: "Incidente Táctico",
    tacticalInspector: "Inspector Táctico del Foco",
    dispatchWhatsApp: "Despachar Brigada WhatsApp",
    whatsappDispatch: "Despacho WhatsApp ICS-209",
    copyIcs209: "Copiar Ficha ICS-209",
    emergencyCall119: "Llamar 119 Bomberos",
    openTunariMap: "Abrir Centro Táctico Tunari",
    loginWithGoogle: "Ingresar con Google",
    waterRequirement: "Demanda Hídrica Estimada",
    routeAccess: "Ruta de Acceso",
    waterRoute: "Ruta de Agua",
    uploadEvidence: "Subir Evidencia",
    sosButton: "SOS / Alerta Comunitaria",
    statusActive: "Activo",
    statusMonitoring: "Monitoreo",
    statusControlled: "Controlado",
    altitude: "Altitud",
    intensityFRP: "Intensidad (FRP)",
    confidence: "Confianza",
    source: "Sensor Satelital",
    recommendedWater: "Agua Táctica Recom.",

    // Mobile
    quickActions: "Acciones Rápidas en Terreno",
    fieldReport: "Reporte de Campo",
    seeFullReport: "Ver Ficha Técnica Táctica Completa",
  },

  qu: {
    // Brand & Header
    appName: "CENTINELA",
    subtitle: "Ñawpaq Willay Nina Rawraymanta Kamachiy",
    appSubtitle: "Ñawpaq Willay Nina Rawraymanta Kamachiy • Quchapampa, Buliwya",
    gamcTitle: "Quchapampa Suyu Kamachiy · Tunari Kawsay Pampa",
    subgamc: "Chunka Hukniyuq Tunari Kiti Rayku",
    systemActive: "LLIK'A LLANK'ACHKAN — Chiqap pachapi killa qhawana",
    systemNotice: "CENTINELA ÑAN · GAMC Kamachina: Killa Qhawana Nina Pitasqa · Tunari Chunka Hukniyuq Kiti",
    modePreventive: "🛡️ 1 ÑIQI: HARK'AY WAN NINA QALLARIY (MANARAQ RAWRAQ TIN)",
    modeCombat: "🚨 2 ÑIQI: CHAYAY WAN NINA THASNUY (MODIS + VIIRS)",
    simulateEvent: "🔥 NINA TUPUY LLANK'AY",
    liveSatelliteData: "Kawsay Killa Willay",
    simulationTunari: "Tunari Hatun Nina Yachariy",

    // Navegación (Desktop & MobileNav)
    navTactical: "Táctico Kamachiy",
    navDashboard: "Táctico Kamachiy",
    navMobile: "Chakrakuna Saywitu",
    navAlerts: "Willaykuna & SOS",
    navReports: "Qillqakuna & SIG",
    navProject: "Kamachina & GAMC",
    navPublic: "Llaqta Yaykuna",
    back: "Kutiy",

    // Columna Izquierda: Riesgo, Clima y Regla 30-30-30
    ignitionRiskTitle: "NINA RAWRAY TUPUQ CHIKAN",
    riskLow: "PISI (THAK)",
    riskModerate: "CHAWPI (QHAWANA)",
    riskHigh: "ANCHA HATUN (LLAKIY)",
    riskGauge: "Rawray Chiki Kay",
    whyRiskTitle: "¿Imaraykutaq kunan p'unchaw riesgo kan",
    rule30Title: "Kamachiy 30-30-30",
    rule303030Title: "Hark'ana Kuyuchina • Kamachiy 30-30-30",
    rule303030Active: "🚨 PUKA WILLAY HARK'ANA 30-30-30 LLANK'ACHKAN",
    rule303030Safe: "LLAKIY PATAMANTA URAPI",
    celluloseThreshold: "🔬 Q'iru Rumi K'anchay Tupuna: 300 °C (572 °F)",
    tempLabel: "Ruphay",
    temp: "Ruphay",
    windLabel: "Wayra",
    wind: "Wayra",
    humidityLabel: "Ch'aran Kay",
    humidity: "Yaku Wayra",
    updateSensorsBtn: "NASA TUPUQ RUNAKUNATA KUTICHIY",
    refreshNasa: "NASA Qhawaqkuna Kawsaychay",
    vegetationCardTitle: "🌲 Kiti Sach'akuna Nina K'anchaynin",

    // Ribbon y Municipios
    allMunicipalities: "Chawpi Quchapampa & Tunari (11 Kiti)",
    waterReservesTotal: "162.000 L yaku hallch'asqa",
    activeHotspots: "nina qhawasqa",
    cisternPoint: "GAMC Yaku Q'ipiq",
    fuelModel: "Rawray Yant'a",
    etaEngine: "Autobomba Chayana: ≤ 25 min",

    // Mapa, Capas y Leyenda
    layerWater: "💧 Mayukuna/Pukyukuna",
    layerVegetation: "🌲 Sach'akuna",
    layerCisterns: "🚛 Yaku Cisternakuna",
    wmtsLayers: "WMTS Patakuna",
    exportGeoJson: "GeoJSON SIG",
    exportCsv: "CSV Willay",
    legendTitle: "Utqay Pusana: ¿Imatam saywitupi rikuni?",
    legendPrevTitle: "1. Q'illu Kiti: Hark'ana Willay (Manaraq nina)",
    legendPrevDesc: "30-30-30 kamachiywan. Sach'akuna chakisqa, ama rawrachiychu.",
    legendInitialTitle: "2. Chiriq Q'illu: Ruphay Qallariynin",
    legendInitialDesc: "Manaraq hatun nina kachkaptin tariy. Utqay qhawana.",
    legendActiveTitle: "3. Puka Unancha: Nina Rawrachkanña",
    legendActiveDesc: "MODIS + VIIRS killa satélite chiqaqchasqa wayrawan pitasqa.",
    legendWaterTitle: "4. Anqas Unancha: Yaku Mayukuna wan Cisternas",
    legendWaterDesc: "Yaku oqharina kiti wan purina allin ñankuna.",

    // Operaciones, Inspector & Despacho
    incidentTitle: "Tarisqa Ninakuna",
    tacticalIncident: "Nina Willay Táctico",
    tacticalInspector: "Nina Qhawaq Kamachiq",
    dispatchWhatsApp: "WhatsApp-wan Cuadrilla Kaway",
    whatsappDispatch: "WhatsApp ICS-209 Kacha",
    copyIcs209: "ICS-209 Rapra Qillqay",
    emergencyCall119: "119 Nina Waqaychanaman Waqyay",
    openTunariMap: "Tunari Kamachinaman Yaykuy",
    loginWithGoogle: "Google-wan Yaykuy",
    waterRequirement: "Munasqa Yaku Yachay",
    routeAccess: "Yaykuna Ñan",
    waterRoute: "Yaku Ñan",
    uploadEvidence: "Rikch'ata Churay",
    sosButton: "SOS / Ayllu Yanapay Willay",
    statusActive: "Rawrachkan",
    statusMonitoring: "Qhawachkan",
    statusControlled: "Thasnusqa",
    altitude: "Sayaynin",
    intensityFRP: "Kallpa (FRP)",
    confidence: "Chiqaq Kay",
    source: "Satélite Killa",
    recommendedWater: "Yaku Munasqa",

    // Mobile
    quickActions: "Utqay Ruranakuna Chaqrapi",
    fieldReport: "Chakra Willay",
    seeFullReport: "Tukuy Táctico Qillqata Qhaway",
  },

  en: {
    // Brand & Header
    appName: "CENTINELA",
    subtitle: "Early Wildfire Prevention & Tactical Dispatch",
    appSubtitle: "Early Wildfire Prevention & Tactical Dispatch • Cochabamba, Bolivia",
    gamcTitle: "Autonomous Municipal Government of Cochabamba · Tunari National Park",
    subgamc: "11 Municipalities of the Metropolitan Axis and Tunari Mountain Range",
    systemActive: "SYSTEM ACTIVE — Real-Time Satellite Monitoring",
    systemNotice: "CENTINELA SYSTEM · GAMC Command: Satellite Monitoring & Tactical Emergency Dispatch · 11 Municipalities of Tunari National Park",
    modePreventive: "🛡️ MODE 1: PREVENTION & IGNITION (BEFORE FIRE)",
    modeCombat: "🚨 MODE 2: INTERCEPTION & COMBAT (MODIS + VIIRS)",
    simulateEvent: "🔥 SIMULATE EVENT",
    liveSatelliteData: "Live Satellite Telemetry",
    simulationTunari: "Tunari Crisis Simulation",

    // Navigation (Desktop & MobileNav)
    navTactical: "Tactical Command",
    navDashboard: "Tactical Command",
    navMobile: "Brigade Map",
    navAlerts: "Alerts & SOS",
    navReports: "Reports & GIS",
    navProject: "Architecture & GAMC",
    navPublic: "Public Access",
    back: "Back",

    // Left Column: Risk, Weather & Rule 30-30-30
    ignitionRiskTitle: "IGNITION RISK INDEX",
    riskLow: "LOW (STABLE)",
    riskModerate: "MODERATE (CAUTION)",
    riskHigh: "VERY HIGH (CRITICAL)",
    riskGauge: "Ignition Risk",
    whyRiskTitle: "Why is today's risk at",
    rule30Title: "Rule 30-30-30",
    rule303030Title: "Preventive Engine • Rule 30-30-30",
    rule303030Active: "🚨 RED PREVENTIVE ALERT 30-30-30 ACTIVE",
    rule303030Safe: "BELOW CRITICAL THRESHOLD",
    celluloseThreshold: "🔬 Cellulosic Pyrolysis Threshold: 300 °C (572 °F)",
    tempLabel: "Temperature",
    temp: "Temp",
    windLabel: "Wind",
    wind: "Wind",
    humidityLabel: "Humidity",
    humidity: "Relative Humidity",
    updateSensorsBtn: "REFRESH NASA SENSORS",
    refreshNasa: "Refresh NASA Sensors",
    vegetationCardTitle: "🌲 Local Fuel & Botany Index",

    // Ribbon & Municipalities
    allMunicipalities: "Central Valley & Tunari (11 Municipalities)",
    waterReservesTotal: "162,000 L water reserve",
    activeHotspots: "monitored hotspots",
    cisternPoint: "GAMC Cistern Tanker",
    fuelModel: "Fuel Model",
    etaEngine: "Fire Engine ETA: ≤ 25 min",

    // Map, Layers & Legend
    layerWater: "💧 Rivers/Tanks",
    layerVegetation: "🌲 Vegetation",
    layerCisterns: "🚛 Cisterns",
    wmtsLayers: "WMTS Layers",
    exportGeoJson: "GIS GeoJSON",
    exportCsv: "CSV Audit",
    legendTitle: "Quick Guide: What does the map show?",
    legendPrevTitle: "1. Amber Area: Preventive Alert (Pre-Fire)",
    legendPrevDesc: "Rule 30-30-30 active. High risk of dry biomass spark. No burns allowed.",
    legendInitialTitle: "2. Orange Marker: Initial Thermal Anomaly",
    legendInitialDesc: "Surface heat approaching 300 °C ignition threshold. Inspection required.",
    legendActiveTitle: "3. Red Marker: Confirmed Active Hotspot",
    legendActiveDesc: "MODIS + VIIRS corroborated (375m) with wind spread vector.",
    legendWaterTitle: "4. Blue Marker: Water Hydrants, Rivers & Tanks",
    legendWaterDesc: "Water extraction points and verified accessible intervention roads.",

    // Operations, Inspector & Dispatch
    incidentTitle: "Detected Incidents",
    tacticalIncident: "Tactical Incident",
    tacticalInspector: "Hotspot Tactical Inspector",
    dispatchWhatsApp: "Dispatch Crew via WhatsApp",
    whatsappDispatch: "WhatsApp ICS-209 Dispatch",
    copyIcs209: "Copy ICS-209 Report",
    emergencyCall119: "Call 119 Firefighters",
    openTunariMap: "Open Tunari Tactical Center",
    loginWithGoogle: "Sign in with Google",
    waterRequirement: "Estimated Water Requirement",
    routeAccess: "Access Route",
    waterRoute: "Water Route",
    uploadEvidence: "Upload Evidence",
    sosButton: "SOS / Community Alert",
    statusActive: "Active",
    statusMonitoring: "Monitoring",
    statusControlled: "Controlled",
    altitude: "Altitude",
    intensityFRP: "Intensity (FRP)",
    confidence: "Confidence",
    source: "Satellite Sensor",
    recommendedWater: "Tactical Water Req.",

    // Mobile
    quickActions: "Field Quick Actions",
    fieldReport: "Field Report",
    seeFullReport: "View Complete Tactical Datasheet",
  },
};

export type TranslationKey = string;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  languages: LanguageInfo[];
  currentLanguage: LanguageInfo;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const STORAGE_KEY = "centinela_lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("es");

  useEffect(() => {
    try {
      const saved = (localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem("centinela_language") ||
        localStorage.getItem("centinela_lang_preference")) as Language | null;

      if (saved && (saved === "es" || saved === "qu" || saved === "en")) {
        setLangState(saved);
      } else {
        setLangState("es");
      }
    } catch {
      setLangState("es");
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      localStorage.setItem("centinela_language", newLang);
    } catch {
      // Ignore write errors in sandboxes
    }
  };

  const t = (key: string): string => {
    const langDict = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
    return langDict[key] ?? TRANSLATIONS.es[key] ?? key;
  };

  const currentLanguage = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]!;

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        t,
        languages: LANGUAGES,
        currentLanguage,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: "es" as Language,
      setLang: () => {},
      t: (key: string) => TRANSLATIONS.es[key] ?? key,
      languages: LANGUAGES,
      currentLanguage: LANGUAGES[0]!,
    };
  }
  return ctx;
}
