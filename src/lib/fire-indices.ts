/**
 * CENTINELA · Física Termodinámica y Métricas Científicas del Fuego
 * NASA Space Apps Challenge Cochabamba 2026
 * 
 * Modelos termodinámicos, botánicos y meteorológicos basados en:
 * - Física de ignición celulósica y triángulo del fuego (300 °C / 572 °F)
 * - Regla del 30-30-30 para emergencias de incendios de rápida propagación (Wildland Red Flag)
 * - Curvas térmicas de fuego activo y comportamiento de incendios de copas
 * - Índice de Peligro de Ångström (Swedish Meteorological and Hydrological Institute)
 * - Cálculo táctico de caudal y volumen de agua de ataque (NFPA 1142 / CONAF / SERNAP)
 */

export const CRITICAL_IGNITION_TEMP_C = 300; // Umbral donde madera, hojas y celulosa arden espontáneamente (572 °F)
export const ADIABATIC_FLAME_TEMP_C = 2000; // Límite termodinámico teórico de flama adiabática

export interface CellulosicIgnitionStatus {
  tempC: number;
  isIgnited: boolean;
  pyrolysisPhase: "Estable" | "Secado / Pirólisis Inicial" | "Pirólisis Acelerada" | "IGNICIÓN ESPONTÁNEA";
  hazardLevel: "Seguro" | "Precaución" | "Crítico" | "Combustión Activa";
  description: string;
}

/**
 * Modela el estado térmico de los combustibles vegetales (madera, hojarasca, ichu)
 * respecto al punto crítico de ignición pirolítica (300 °C).
 */
export function checkCellulosicIgnition(tempC: number): CellulosicIgnitionStatus {
  if (tempC >= CRITICAL_IGNITION_TEMP_C) {
    return {
      tempC,
      isIgnited: true,
      pyrolysisPhase: "IGNICIÓN ESPONTÁNEA",
      hazardLevel: "Combustión Activa",
      description: `Temperatura de ${tempC} °C supera el umbral celulósico (300 °C). Liberación masiva de gases inflamables e ignición sostenida.`,
    };
  }
  if (tempC >= 200) {
    return {
      tempC,
      isIgnited: false,
      pyrolysisPhase: "Pirólisis Acelerada",
      hazardLevel: "Crítico",
      description: `Temperatura de ${tempC} °C. Descomposición térmica activa de hemicelulosa y lignina; emisión de humo denso y pre-calentamiento.`,
    };
  }
  if (tempC >= 100) {
    return {
      tempC,
      isIgnited: false,
      pyrolysisPhase: "Secado / Pirólisis Inicial",
      hazardLevel: "Precaución",
      description: `Temperatura de ${tempC} °C. Evaporación completa del agua intersticial del combustible vegetal. Deshidratación severa.`,
    };
  }
  return {
    tempC,
    isIgnited: false,
    pyrolysisPhase: "Estable",
    hazardLevel: "Seguro",
    description: `Temperatura de ${tempC} °C en rango fisiológico. Sin pirólisis activa.`,
  };
}

export interface Rule30Result {
  active: boolean;
  severity: "EMERGENCIA CRÍTICA" | "ALERTA ELEVADA" | "MODERADA" | "NORMAL";
  score: number; // 0 a 100 de convergencia
  description: string;
  factors: {
    tempMet: boolean; // > 30 °C
    tempValue: number;
    windMet: boolean; // > 30 km/h
    windValue: number;
    rhMet: boolean;   // < 30%
    rhValue: number;
  };
}

/**
 * Regla de Oro Internacional del Manejo de Fuego Forestal: 30-30-30
 * Confluyen simultáneamente:
 * 1. Temperatura ambiente > 30 °C (deseca y precalienta el estrato vegetal)
 * 2. Viento sostenido o ráfagas > 30 km/h (oxigena y genera avance por pavesas)
 * 3. Humedad Relativa < 30% (combustibles finos alcanzan punto de ignición en minutos)
 */
export function evaluateRule30_30_30(temp: number, windKmH: number, rh: number): Rule30Result {
  const tempMet = temp > 30;
  const windMet = windKmH > 30;
  const rhMet = rh < 30;

  // Contador de factores cumplidos (0 a 3)
  const factorsCount = (tempMet ? 1 : 0) + (windMet ? 1 : 0) + (rhMet ? 1 : 0);
  const active = factorsCount === 3;

  // Puntuación continua de proximidad al 30-30-30
  const tempFactor = Math.min(1.5, Math.max(0, temp / 30));
  const windFactor = Math.min(1.5, Math.max(0, windKmH / 30));
  const rhFactor = Math.min(1.5, Math.max(0, (60 - Math.min(rh, 60)) / 30));
  const score = Math.round(Math.min(100, ((tempFactor + windFactor + rhFactor) / 3) * 100));

  let severity: Rule30Result["severity"] = "NORMAL";
  let description = "Condiciones atmosféricas bajo los umbrales críticos de propagación extrema.";

  if (active) {
    severity = "EMERGENCIA CRÍTICA";
    description = "¡ALERTA ROJA TÁCTICA 30-30-30! Fusión de >30°C, >30 km/h y <30% HR. Comportamiento explosivo del fuego y avance descontrolado.";
  } else if (factorsCount === 2) {
    severity = "ALERTA ELEVADA";
    description = "Condición pre-crítica: 2 de los 3 parámetros 30-30-30 alcanzados. Alerta preventiva para brigadas y apresto de cisternas.";
  } else if (factorsCount === 1) {
    severity = "MODERADA";
    description = "1 factor del 30-30-30 sobre el umbral. Monitoreo regular de estaciones meteorológicas.";
  }

  return {
    active,
    severity,
    score,
    description,
    factors: {
      tempMet,
      tempValue: temp,
      windMet,
      windValue: windKmH,
      rhMet,
      rhValue: rh,
    },
  };
}

export interface ThermalCurvePoint {
  minute: number;
  temperatureC: number;
  regime: "Ignición" | "Desarrollo / Flashover" | "Fuego Pleno" | "Copas / Flama Extrema";
  safeDistanceMeters: number;
  radiationKwM2: number;
}

/**
 * Modela la curva térmica de escalamiento temporal de un incendio.
 * - En espacio confinado/quebrada: sube de 30 °C a 300-850 °C entre el minuto 3 y 4 (Flashover).
 * - En fuego abierto / bosque de pino/eucalipto: alcanza 900 °C - 1.200 °C+ en incendios de copa.
 */
export function fireThermalCurve(minutes: number, isEnclosed = false): ThermalCurvePoint {
  const m = Math.max(0, minutes);
  let temp = 30; // Temperatura inicial ambiente
  let regime: ThermalCurvePoint["regime"] = "Ignición";

  if (isEnclosed) {
    // Curva ISO 834 / ASTM E119 acelerada en quebradas y estructuras
    if (m <= 2) {
      temp = 30 + m * 110; // Hasta ~250 °C
      regime = "Ignición";
    } else if (m <= 4) {
      // Flashover violento (300 °C a 850 °C)
      temp = 250 + (m - 2) * 300; // Minuto 4 -> 850 °C
      regime = "Desarrollo / Flashover";
    } else if (m <= 10) {
      temp = 850 + (m - 4) * 20; // 850 a 970 °C
      regime = "Fuego Pleno";
    } else {
      temp = Math.min(1150, 970 + Math.log10(m - 9) * 80);
      regime = "Copas / Flama Extrema";
    }
  } else {
    // Incendio forestal a cielo abierto con combustible vegetal
    if (m <= 3) {
      temp = 30 + m * 90; // Min 3 -> 300 °C (inicio ignición celulosa)
      regime = "Ignición";
    } else if (m <= 7) {
      temp = 300 + (m - 3) * 150; // Min 7 -> 900 °C
      regime = "Fuego Pleno";
    } else if (m <= 15) {
      temp = 900 + (m - 7) * 35; // Min 15 -> ~1.180 °C (incendio de copas en pinos/eucalipto)
      regime = "Copas / Flama Extrema";
    } else {
      temp = Math.min(1250, 1180 + (m - 15) * 5);
      regime = "Copas / Flama Extrema";
    }
  }

  // Radiación térmica aproximada (Stefan-Boltzmann simplificado a distancia operativa)
  const radiationKwM2 = Math.round(Math.pow((temp + 273.15) / 1000, 4) * 5.67 * 10) / 10;
  // Distancia segura para personal de bomberos sin equipo aluminizado (< 4 kW/m²)
  const safeDistanceMeters = Math.max(15, Math.round(Math.sqrt(radiationKwM2 / 4) * 8));

  return {
    minute: m,
    temperatureC: Math.round(temp),
    regime,
    safeDistanceMeters,
    radiationKwM2,
  };
}

export interface FireWaterRequirement {
  litersPerMinute: number; // Caudal de ataque requerido (L/min)
  totalWaterLiters: number; // Reserva total recomendada para contención (L)
  truckLoadsRequired: number; // Cisternas estándar de 10.000 L equivalentes
  tacticalNotes: string;
}

/**
 * Calcula la demanda hídrica para combate directo e indirecto
 * según la Potencia Radiativa del Fuego (FRP en MW), área afectada y si la Regla 30-30-30 está activa.
 */
export function calculateFireWaterRequirement(
  frpMW: number,
  areaHa: number | null = null,
  isRule30Active = false
): FireWaterRequirement {
  const safeFrp = Math.max(1, typeof frpMW === "number" && !isNaN(frpMW) && isFinite(frpMW) ? Math.abs(frpMW) : 15);
  const safeArea = Math.max(1, typeof areaHa === "number" && !isNaN(areaHa) && isFinite(areaHa) && areaHa > 0 ? areaHa : safeFrp * 0.4);

  // Caudal base de línea de ataque: garantizado mínimo 500 L/min para evitar valores negativos
  let lpm = Math.max(500, Math.round(350 + safeFrp * 45 + Math.min(600, safeArea * 15)));
  let totalLiters = Math.max(5000, Math.round(safeFrp * 1400 + safeArea * 2800));

  if (isRule30Active) {
    // Multiplicador por evaporación acelerada y avance dinámico a sotavento
    lpm = Math.round(lpm * 1.45);
    totalLiters = Math.round(totalLiters * 1.6);
  }

  lpm = Math.max(500, lpm);
  totalLiters = Math.max(5000, totalLiters);
  const truckLoads = Math.max(1, Math.ceil(totalLiters / 10000)); // Cisternas estándar de 10.000 L

  let tacticalNotes = "Ataque inicial con 1 línea de manguera de 1.5 pulg y cuadrilla de 5 combatientes.";
  if (lpm > 1500) {
    tacticalNotes = "Demanda extrema: Requiere múltiples frentes de ataque simultáneo, apoyo de autobombas de 10.000L en carrusel y helibalde.";
  } else if (lpm > 600) {
    tacticalNotes = "Ataque directo reforzado: 2 autobombas con relevo de abastecimiento continuo en hidrante o laguna.";
  }

  return {
    litersPerMinute: lpm,
    totalWaterLiters: totalLiters,
    truckLoadsRequired: truckLoads,
    tacticalNotes,
  };
}

export interface IgnitionRiskParams {
  temp: number;
  windKmH: number;
  rh: number;
  simultaneousHotspots?: number;
  botanicalMultiplier?: number;
}

/**
 * Motor de Riesgo de Ignición Táctico (0 - 100):
 * - 35% Temperatura normalizada (T2M)
 * - 35% Viento normalizado (WS10M)
 * - 30% Sequedad atmosférica (100 - RH2M)
 * - Hasta 12 puntos adicionales por focos simultáneos en la región
 * - Modulación por factor botánico de inflamabilidad (ej. Eucalipto 1.6x, Pino 1.5x)
 */
export function calculateIgnitionRiskScore(params: IgnitionRiskParams): number {
  const { temp, windKmH, rh, simultaneousHotspots = 0, botanicalMultiplier = 1.0 } = params;

  // Normalización
  const normTemp = Math.min(Math.max((temp - 5) / 32, 0), 1); // 5°C a 37°C
  const normWind = Math.min(Math.max(windKmH / 45, 0), 1);     // 0 a 45 km/h
  const normDry = Math.min(Math.max((100 - rh) / 80, 0), 1);   // 20% a 100% sequedad

  const baseScore = (normTemp * 0.35 + normWind * 0.35 + normDry * 0.30) * 100;
  
  // Bono por focos térmicos simultáneos detectados en las últimas 12h (hasta 12 pts)
  const hotspotBonus = Math.min(12, simultaneousHotspots * 2.5);

  // Aplicar factor botánico
  const adjusted = (baseScore + hotspotBonus) * Math.min(1.6, Math.max(0.8, botanicalMultiplier));

  return Math.round(Math.min(100, Math.max(0, adjusted)));
}

export interface AngstromResult {
  index: number;
  label: "Peligro Extremo" | "Peligro Alto" | "Peligro Moderado" | "Peligro Bajo";
  color: string;
  description: string;
}

/**
 * Calcula el Índice de Peligro de Incendio de Ångström.
 * Fórmula: I = (HR / 20) + (27 - Temp) / 10
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

// ==========================================
// MÓDULO 4: ALGORITMO INTEGRADO SÚPER-PREDICTIVO DE RIESGO DE IGNICIÓN TOTAL
// ==========================================
export interface TotalIgnitionRiskParams {
  tempC: number;
  windKmh: number;
  rhPct: number;
  vegetationMultiplier?: number;
  thermalAnomalyTempC?: number | null;
  isHotspotCluster?: boolean;
}

export interface TotalIgnitionRiskResult {
  totalRiskPct: number;
  riskLevel: "Bajo" | "Moderado" | "Alto" | "Crítico / Extremo";
  severityColor: string;
  breakdown: {
    weatherScore: number;
    tempWeightPct: number;
    windWeightPct: number;
    rhWeightPct: number;
    vegetationMultiplier: number;
    cellulosicBonusPct: number;
    clusterBonusPct: number;
    explanation: string;
  };
}

/**
 * Fusión de los 4 Pilares Predictivos:
 * 1. Clima 30-30-30: ponderación 35% temperatura, 35% viento, 30% sequedad de aire.
 * 2. Triángulo del Fuego Vegetal: multiplicador botánico (1.15x a 1.35x).
 * 3. Física de Ignición Celulósica (300 °C): bonus por calor anómalo pre-fuego.
 * 4. Concentración Consecutiva: bonus de recurrencia en zonas críticas.
 */
export function calculateTotalIgnitionRisk(params: TotalIgnitionRiskParams): TotalIgnitionRiskResult {
  const {
    tempC,
    windKmh,
    rhPct,
    vegetationMultiplier = 1.0,
    thermalAnomalyTempC = null,
    isHotspotCluster = false,
  } = params;

  // 1. Pilares Meteorológicos 30-30-30 ponderados:
  const tempRatio = Math.min(1, Math.max(0, (tempC - 10) / 25));
  const windRatio = Math.min(1, Math.max(0, windKmh / 45));
  const rhRatio = Math.min(1, Math.max(0, (65 - rhPct) / 50));

  const tempWeight = Math.round(tempRatio * 35);
  const windWeight = Math.round(windRatio * 35);
  const rhWeight = Math.round(rhRatio * 30);
  const weatherBase = Math.min(100, tempWeight + windWeight + rhWeight);

  // 2. Modulador Botánico / Vegetación Pirofítica (1.15x a 1.35x)
  const botanyAdjusted = weatherBase * Math.max(1.0, vegetationMultiplier);

  // 3. Umbral Celulósico de 300°C (Pirólisis y Calor Superficial)
  let cellulosicBonus = 0;
  if (thermalAnomalyTempC !== null && thermalAnomalyTempC !== undefined) {
    if (thermalAnomalyTempC >= 300) {
      cellulosicBonus = 25; // Supera 300°C: ignición espontánea
    } else if (thermalAnomalyTempC >= 200) {
      cellulosicBonus = 15; // 200°C - 300°C: pirólisis acelerada
    } else if (thermalAnomalyTempC >= 100) {
      cellulosicBonus = 8; // 100°C - 200°C: deshidratación térmica
    }
  }

  // 4. Bonus de Recurrencia Histórica / Clúster Concentrado
  const clusterBonus = isHotspotCluster ? 12 : 0;

  // Total acumulado (clamped 0 a 100)
  const totalRiskPct = Math.min(100, Math.round(botanyAdjusted + cellulosicBonus + clusterBonus));

  let riskLevel: TotalIgnitionRiskResult["riskLevel"] = "Bajo";
  let severityColor = "#22c55e";
  if (totalRiskPct >= 80) {
    riskLevel = "Crítico / Extremo";
    severityColor = "#ef4444";
  } else if (totalRiskPct >= 60) {
    riskLevel = "Alto";
    severityColor = "#f97316";
  } else if (totalRiskPct >= 40) {
    riskLevel = "Moderado";
    severityColor = "#eab308";
  }

  const parts: string[] = [
    `Clima 30-30-30 (${weatherBase}% base: Temp ${tempWeight}%, Viento ${windWeight}%, Sequedad ${rhWeight}%)`,
  ];
  if (vegetationMultiplier > 1.0) {
    parts.push(`Factor Vegetal x${vegetationMultiplier.toFixed(2)}`);
  }
  if (cellulosicBonus > 0) {
    parts.push(`Calor Anómalo +${cellulosicBonus}% (${thermalAnomalyTempC}°C)`);
  }
  if (clusterBonus > 0) {
    parts.push(`Zona Recurrente Crítica +${clusterBonus}%`);
  }

  const explanation = `Riesgo consolidado del ${totalRiskPct}% [${riskLevel}]: ${parts.join(" + ")}.`;

  return {
    totalRiskPct,
    riskLevel,
    severityColor,
    breakdown: {
      weatherScore: weatherBase,
      tempWeightPct: tempWeight,
      windWeightPct: windWeight,
      rhWeightPct: rhWeight,
      vegetationMultiplier,
      cellulosicBonusPct: cellulosicBonus,
      clusterBonusPct: clusterBonus,
      explanation,
    },
  };
}

