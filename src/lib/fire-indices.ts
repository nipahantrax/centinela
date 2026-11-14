/**
 * Índices Científicos y Tácticos de Manejo del Fuego
 * Basados en estándares internacionales de meteorología forestal y teledetección térmica de la NASA.
 */

export interface AngstromResult {
  index: number;
  label: "Peligro Extremo" | "Peligro Alto" | "Peligro Moderado" | "Peligro Bajo";
  color: string;
  description: string;
}

/**
 * Calcula el Índice de Peligro de Incendio de Ångström.
 * Fórmula: I = (HR / 20) + (27 - Temp) / 10
 * Parámetros:
 * - temp: Temperatura del aire en °C (ej. NASA POWER T2M)
 * - rh: Humedad relativa en % (ej. NASA POWER RH2M)
 */
export function calculateAngstromIndex(temp: number, rh: number): AngstromResult {
  const i = Math.round(((rh / 20) + (27 - temp) / 10) * 100) / 100;

  if (i < 2.0) {
    return {
      index: i,
      label: "Peligro Extremo",
      color: "var(--destructive)",
      description: "Condiciones críticas de sequedad y calor. Ignición inmediata y propagación violenta.",
    };
  }
  if (i < 2.5) {
    return {
      index: i,
      label: "Peligro Alto",
      color: "var(--fire)",
      description: "Combustibles finos altamente inflamables. Alta probabilidad de inicio de fuegos.",
    };
  }
  if (i < 4.0) {
    return {
      index: i,
      label: "Peligro Moderado",
      color: "var(--warning)",
      description: "Propagación controlable en pastizales; atención en horas de máxima insolación.",
    };
  }
  return {
    index: i,
    label: "Peligro Bajo",
    color: "var(--success)",
    description: "Humedad suficiente en combustibles. Baja probabilidad de ignición sostenida.",
  };
}

export interface FrpSeverity {
  category: "Baja" | "Moderada" | "Alta" | "Crítica (Extrema)";
  colorClass: string;
  tacticalAdvice: string;
  recommendedWaterLiters: number;
  bufferRadiusMeters: number;
}

/**
 * Clasifica la Potencia Radiativa del Fuego (FRP en Megavatios - MW)
 * detectada por los sensores MODIS / VIIRS.
 */
export function classifyFrp(frp: number | null | undefined): FrpSeverity {
  const mw = frp ?? 0;
  if (mw >= 100) {
    return {
      category: "Crítica (Extrema)",
      colorClass: "text-destructive",
      tacticalAdvice: "Foco de energía masiva. Riesgo de pirocúmulos y focos secundarios por pavesas. Ataque aéreo prioritario.",
      recommendedWaterLiters: 15000,
      bufferRadiusMeters: 800,
    };
  }
  if (mw >= 50) {
    return {
      category: "Alta",
      colorClass: "text-fire",
      tacticalAdvice: "Frente de llama de alta intensidad calórica. Requiere líneas de defensa mecanizadas y abastecimiento continuo.",
      recommendedWaterLiters: 8000,
      bufferRadiusMeters: 500,
    };
  }
  if (mw >= 15) {
    return {
      category: "Moderada",
      colorClass: "text-warning",
      tacticalAdvice: "Incendio activo con propagación sostenida. Apto para ataque directo por cuadrilla con apoyo de autobomba.",
      recommendedWaterLiters: 4000,
      bufferRadiusMeters: 250,
    };
  }
  return {
    category: "Baja",
    colorClass: "text-success",
    tacticalAdvice: "Foco incipiente, quema controlada o punto caliente residual. Fácil contención si se interviene rápidamente.",
    recommendedWaterLiters: 1500,
    bufferRadiusMeters: 100,
  };
}

/**
 * Devuelve el rumbo cardinal en español y ángulo complementario
 */
export function getWindCompassInfo(degrees: number) {
  const directions = [
    { label: "Norte (N)", short: "N" },
    { label: "Nor-Noreste (NNE)", short: "NNE" },
    { label: "Noreste (NE)", short: "NE" },
    { label: "Este-Noreste (ENE)", short: "ENE" },
    { label: "Este (E)", short: "E" },
    { label: "Este-Sureste (ESE)", short: "ESE" },
    { label: "Sureste (SE)", short: "SE" },
    { label: "Sur-Sureste (SSE)", short: "SSE" },
    { label: "Sur (S)", short: "S" },
    { label: "Sur-Suroeste (SSO)", short: "SSO" },
    { label: "Suroeste (SO)", short: "SO" },
    { label: "Oeste-Suroeste (OSO)", short: "OSO" },
    { label: "Oeste (O)", short: "O" },
    { label: "Oeste-Noroeste (ONO)", short: "ONO" },
    { label: "Noroeste (NO)", short: "NO" },
    { label: "Nor-Noroeste (NNO)", short: "NNO" },
  ];
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  const current = directions[index] ?? { label: "Norte (N)", short: "N" };
  const advanceDegree = (normalized + 180) % 360; // Hacia donde sopla el viento
  return {
    bearingFrom: normalized,
    advanceToward: advanceDegree,
    label: current.label,
    short: current.short,
  };
}
