import type { Incident, MunicipalCisternPoint, HumanRiskPoint, BotanicalProfile } from "./centinela-data";
import { evaluateRule30_30_30, calculateFireWaterRequirement, classifyFrp } from "./fire-indices";

// Leaflet popup strings are HTML; external labels must never become markup.
export function escapeMapText(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] ?? char));
}

export const COCHABAMBA_STATS_2026 = {
  burnedAreaGrasslandsPercent: 90, // 90% pastizales, ichu y matorrales secos
  burnedAreaForestsPercent: 10,    // 10% bosque de pinos, eucaliptos y relictos de kewiña
  fireIncrease2026Percent: 180,    // +180% incremento en focos de calor en 2026 vs promedio histórico
  boliviaBurnedHa2024: 10770000,   // 10.77 millones de hectáreas quemadas en Bolivia (2024)
  boliviaBurnedHa2025: 2600000,    // 2.6 millones de hectáreas (2025)
  responseTargetMinutes: 18,       // Meta táctica de arribo de brigada: 18 min
  protectedHectaresCbba: 12430,    // Hectáreas protegidas directamente en el Parque Tunari
};

/**
 * Genera el HTML enriquecido para el popup de un foco de calor en Leaflet
 */
export function buildHotspotPopupHtml(incident: Incident, temp = 31, wind = 35, rh = 17): string {
  const rule30 = evaluateRule30_30_30(temp, wind, rh);
  const frp = classifyFrp(incident.frp);
  const water = calculateFireWaterRequirement(incident.frp ?? 15, incident.areaHa, rule30.active);

  const isDual = incident.source === "MODIS+VIIRS armonizado";
  const badgeDual = isDual
    ? `<span style="background:#0ea5e9;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;">🛰️ FUSIÓN NASA MODIS+VIIRS (375m)</span>`
    : `<span style="background:#f59e0b;color:#000;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;">${escapeMapText(incident.source)}</span>`;

  const badgeRule30 = rule30.active
    ? `<div style="background:#ef4444;color:#fff;padding:4px 6px;border-radius:4px;margin-top:6px;font-size:11px;font-weight:bold;">🚨 ALERTA 30-30-30 ACTIVA: Propagación Violenta</div>`
    : "";

  const bot = incident.botany;
  const botHtml = bot
    ? `<div style="margin-top:6px;border-top:1px solid #334155;padding-top:4px;font-size:11px;">
        <b>🌱 Modelo de Combustible:</b> ${escapeMapText(bot.fuelModel)}<br/>
        <b>Multiplicador botánico:</b> <span style="color:#f97316;">${bot.overallMultiplier}x</span><br/>
        <span style="color:#94a3b8;font-size:10px;">${escapeMapText(bot.advisory)}</span>
       </div>`
    : "";

  return `
    <div style="font-family:sans-serif;min-width:240px;color:#f1f5f9;background:#0f172a;padding:8px;border-radius:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <b style="font-size:13px;color:#38bdf8;">${escapeMapText(incident.id)}</b>
        ${badgeDual}
      </div>
      <div style="font-size:12px;color:#cbd5e1;margin-bottom:4px;">
        <b>Zona:</b> ${escapeMapText(incident.zone)}<br/>
        <b>Confianza:</b> ${incident.confidence ?? 60}% · <b>FRP:</b> ${incident.frp ?? 0} MW (${frp.category})<br/>
        <b>Demanda Hídrica:</b> ~${water.litersPerMinute} L/min (${water.truckLoadsRequired} cisterna(s))
      </div>
      ${badgeRule30}
      ${botHtml}
      <div style="margin-top:6px;border-top:1px solid #334155;padding-top:4px;font-size:10px;color:#94a3b8;">
        Hidrante más cercano: <b>${escapeMapText(incident.hydrant.name)}</b> (${incident.hydrant.distKm ?? "N/D"} km)<br/>
        Ruta táctica: <b>${escapeMapText(incident.route.state)}</b>
      </div>
    </div>
  `;
}

/**
 * Genera el HTML para el popup de un Punto de Cisterna Municipal en apresto
 */
export function buildCisternPopupHtml(cistern: MunicipalCisternPoint): string {
  return `
    <div style="font-family:sans-serif;min-width:220px;color:#f1f5f9;background:#0f172a;padding:8px;border-radius:8px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <span style="font-size:16px;">🚒</span>
        <b style="font-size:13px;color:#0ea5e9;">Cisterna Municipal ${escapeMapText(cistern.municipality)}</b>
      </div>
      <div style="font-size:11px;color:#cbd5e1;line-height:1.4;">
        <b>Ubicación:</b> ${escapeMapText(cistern.name)}<br/>
        <b>Capacidad:</b> <span style="color:#22c55e;font-weight:bold;">${cistern.capacityLiters.toLocaleString()} Litros</span><br/>
        <b>Estado Operativo:</b> <span style="color:#f59e0b;font-weight:bold;">${escapeMapText(cistern.status)}</span><br/>
        <b>Contacto de Radio:</b> ${escapeMapText(cistern.contact)}
      </div>
      <div style="margin-top:6px;border-top:1px solid #334155;padding-top:4px;font-size:10px;color:#94a3b8;">
        Estrategia 30-30-30: Preposicionada para abastecimiento continuo en menos de 15 minutos.
      </div>
    </div>
  `;
}

/**
 * Genera el HTML para un Punto de Riesgo Antrópico / Camping
 */
export function buildHumanRiskPopupHtml(point: HumanRiskPoint): string {
  return `
    <div style="font-family:sans-serif;min-width:220px;color:#f1f5f9;background:#0f172a;padding:8px;border-radius:8px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <span style="font-size:16px;">⚠️</span>
        <b style="font-size:12px;color:#f97316;">${escapeMapText(point.name)}</b>
      </div>
      <div style="font-size:11px;color:#cbd5e1;line-height:1.4;">
        <b>Tipo:</b> ${escapeMapText(point.type)}<br/>
        <b>Altitud:</b> ${point.altitudeM} msnm<br/>
        <span style="color:#fca5a5;font-size:10px;">${escapeMapText(point.riskNote)}</span>
      </div>
      <div style="margin-top:4px;font-size:9px;color:#94a3b8;font-style:italic;">
        "De arriba suelen surgir los incendios": Área prioritaria de fiscalización ciudadana.
      </div>
    </div>
  `;
}
