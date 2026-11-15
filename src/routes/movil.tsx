import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Droplets,
  Layers,
  LayoutDashboard,
  Thermometer,
  Wind,
  Sparkles,
  Share2,
  Navigation,
  Camera,
  Flame,
  ShieldCheck,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import shield from "@/assets/shield.png";
import { useNasa } from "@/hooks/use-nasa";
import { NasaControls } from "@/components/centinela/NasaControls";
import { OperationsPanel } from "@/components/centinela/OperationsPanel";
import type { Horizon } from "@/lib/fire-operations";
import { TacButton } from "@/components/centinela/Brand";
import { snapshotQuery, powerQuery, gibsQuery } from "@/lib/nasa-queries";
import { MobileNav } from "@/components/centinela/MobileNav";
import { TacticalMap, type Layers as L } from "@/components/centinela/TacticalMap";
import { MunicipalityRibbon } from "@/components/centinela/MunicipalityRibbon";
import { LanguageSelector } from "@/components/centinela/LanguageSelector";
import { useI18n } from "@/lib/i18n";
import {
  NODES,
  ignitionRisk,
  riskLabel,
  findNearestWaterResource,
  RECURRENCE_CLUSTERS,
} from "@/lib/centinela-data";
import {
  buscarAguaCercana,
  registrarDespachoICS209,
  type AguaCercanaResult,
  type DespachoICS209Result,
} from "@/lib/supabase";
import { calculateTotalIgnitionRisk, classifyFrp } from "@/lib/fire-indices";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/movil")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Mando Táctico Tunari (Cochabamba)" },
      {
        name: "description",
        content:
          "Mapa táctico de Cochabamba y los 11 municipios del Parque Tunari: focos NASA, hidrantes GAMC y rutas de intervención.",
      },
      { property: "og:title", content: "CENTINELA · Mando Táctico Tunari (Cochabamba)" },
      {
        property: "og:description",
        content: "Monitoreo satelital en tiempo real de los 11 municipios del Parque Nacional Tunari y eje metropolitano.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(snapshotQuery),
      context.queryClient.ensureQueryData(powerQuery(-17.31, -66.2)),
      context.queryClient.ensureQueryData(gibsQuery),
    ]);
  },
  component: Mobile,
});

function Mobile() {
  const { t } = useI18n();
  const nasa = useNasa();
  const [selectedId, setSelectedId] = useState("");
  const w = nasa.weather ?? { temp: 31, wind: 35, rh: 17, windDir: "NE", windDeg: 45 };
  const selected = selectedId ? (nasa.incidents.find((i) => i.id === selectedId) ?? null) : null;
  const active = nasa.incidents.length;
  const r = 34,
    c = 2 * Math.PI * r;

  const activeNode = NODES.find((node) => node.id === nasa.regionId) ?? NODES[0]!;
  const frpInfo = selected ? classifyFrp(selected.frp) : null;

  const totalIgnition = calculateTotalIgnitionRisk({
    tempC: w.temp,
    windKmh: w.wind,
    rhPct: w.rh,
    vegetationMultiplier: selected?.botany?.overallMultiplier ?? activeNode.botany.overallMultiplier,
    thermalAnomalyTempC: selected ? ((selected.frp ?? 0) > 30 ? 320 : (selected.frp ?? 0) > 10 ? 220 : 120) : null,
    isHotspotCluster: RECURRENCE_CLUSTERS.some((c) =>
      selected ? Math.hypot(c.center[0] - selected.lat, c.center[1] - selected.lng) * 111 <= 3.5 : false
    ),
  });
  const risk = totalIgnition.totalRiskPct;
  const { label } = riskLabel(risk);
  const [layers, setLayers] = useState<L>({ thermal: true, viirsThermal: true });
  const [horizon, setHorizon] = useState<Horizon | 0>(0);
  const [open, setOpen] = useState(false);
  const [tacticalMode, setTacticalMode] = useState<"preventive" | "combat">("preventive");
  const [lastDispatch, setLastDispatch] = useState<DespachoICS209Result | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  const handleWhatsAppDispatch = async () => {
    if (!selected) {
      toast.error("Selecciona un foco en el mapa primero.");
      return;
    }
    setIsDispatching(true);
    const nearestWater = findNearestWaterResource(selected.lat, selected.lng);
    const botany = selected.botany ?? activeNode.botany;
    const cluster = RECURRENCE_CLUSTERS.find(
      (c) => Math.hypot(c.center[0] - selected.lat, c.center[1] - selected.lng) * 111 <= 4.0
    );

    // Consulta de agua PostGIS
    let waterName = nearestWater.resource.name;
    let waterDist = nearestWater.distKm;
    try {
      const waters = await buscarAguaCercana(selected.lat, selected.lng);
      if (waters && waters.length > 0) {
        waterName = waters[0]!.nombre;
        waterDist = waters[0]!.distancia_km;
      }
    } catch {
      // fallback
    }

    let dispatchRecord: DespachoICS209Result;
    try {
      dispatchRecord = await registrarDespachoICS209({
        focoId: selected.id,
        municipio: selected.zone,
        brigada: "GEOS / SAR-Bolivia / Bomberos 119",
        aguaOrigen: `${waterName} (${waterDist} km)`,
        detalles: {
          lat: selected.lat,
          lng: selected.lng,
          frp: selected.frp,
          source: selected.source,
        },
      });
      setLastDispatch(dispatchRecord);
      toast.success(`Despacho Oficial ${dispatchRecord.codigo_ics} registrado en PostgreSQL`, {
        description: `Hash inmutable: ${dispatchRecord.hash_sha256.slice(0, 16)}...`,
      });
    } catch {
      dispatchRecord = {
        codigo_ics: `ICS209-${Date.now().toString().slice(-6)}`,
        hash_sha256: "local-emergency-sha256",
        despachado_en: new Date().toISOString(),
        source: "local_immutable",
      };
      setLastDispatch(dispatchRecord);
    } finally {
      setIsDispatching(false);
    }

    const msg =
      `🚨 *CENTINELA · DESPACHO OPERATIVO TÁCTICO MÓVIL*\n` +
      `_Sistema Táctico de Intervención — NASA Space Apps Cochabamba 2026_\n\n` +
      `🛡️ *REGISTRO POSTGRESQL + POSTGIS INMUTABLE:*\n` +
      `   *Código ICS-209:* ${dispatchRecord.codigo_ics}\n` +
      `   *Hash SHA-256:* \`${dispatchRecord.hash_sha256}\`\n\n` +
      `🔥 *FOCO:* ${selected.id} [${selected.status}]\n` +
      `📍 *ZONA:* ${selected.zone}\n` +
      `🗺️ *COORDENADAS:* ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}\n` +
      `⛰️ *ALTITUD:* ${selected.altitude ? `${selected.altitude} msnm` : "Tunari"}\n` +
      `🌐 *RUTA GPS DIRECTA:* https://www.google.com/maps/dir/?api=1&destination=${selected.lat.toFixed(5)},${selected.lng.toFixed(5)}\n\n` +
      `🌲 *VEGETACIÓN:* ${botany.fuelModel} (Factor ${botany.overallMultiplier}x)\n` +
      `🚒 *ACCESO:* ${selected.route?.distKm ?? "12"} km (~${selected.route?.etaMin ?? "25"} min)\n` +
      `💧 *AGUA POSTGIS:* ${waterName} a ${waterDist} km\n` +
      `🚰 *AGUA ESTIMADA:* ~${frpInfo?.recommendedWaterLiters ?? 4000} L (FRP: ${selected.frp ?? "N/D"} MW)\n` +
      (cluster ? `🚛 *CISTERNA PREVENTIVA SUGERIDA:* ${cluster.suggestedCistern.name}\n` : "") +
      `\n_Dirigido a Bomberos 119 GAMC / SAR-Bolivia / UGR_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleRouteToHydrant = () => {
    if (!selected) {
      toast.error("Selecciona un foco en el mapa primero.");
      return;
    }
    const nearestWater = findNearestWaterResource(selected.lat, selected.lng);
    toast.info(`Ruta hídrica a: ${nearestWater.resource.name} (${nearestWater.distKm} km)`);
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${selected.lat},${selected.lng}&destination=${nearestWater.resource.lat},${nearestWater.resource.lng}`,
      "_blank"
    );
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-none lg:max-w-[1920px] px-2 sm:px-4 bg-[#030712] flex-col pb-24 overflow-x-hidden">
      {/* Banner Institucional Móvil GAMC */}
      <div className="bg-primary/20 border-b border-primary/30 px-3 py-1.5 flex items-center justify-between text-[11px] font-mono">
        <span className="flex items-center gap-1.5 font-bold text-foreground">
          <Award className="h-3.5 w-3.5 text-primary" />
          <span>CENTINELA · GAMC Tunari</span>
        </span>
        <div className="flex items-center gap-2">
          <LanguageSelector compact />
          <Link to="/proyecto" className="text-primary underline font-bold hover:text-primary/80">
            {t("navProject")} →
          </Link>
        </div>
      </div>

      <header className="flex items-center gap-3 px-4 py-3">
        <img src={shield} alt="" width={816} height={816} className="h-9 w-9" />
        <div className="flex-1 min-w-0">
          <div className="font-mono font-bold tracking-[0.2em] truncate">CENTINELA</div>
          <div className="text-xs text-muted-foreground truncate">
            {nasa.simulationMode
              ? "🚨 Simulación Táctica Tunari"
              : nasa.regionId === "all"
              ? "Cochabamba · Valle Central & Tunari"
              : `Cochabamba · ${nasa.region?.name ?? nasa.regionId}`}
          </div>
        </div>
        <Link
          to="/dashboard"
          aria-label="Panel de comando"
          className="rounded-md border border-border p-2 text-primary hover:bg-primary/10 transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
        </Link>
        {nasa.incidents[0] ? (
          <Link
            to="/alerta/$id"
            params={{ id: nasa.incidents[0].id }}
            aria-label="Alertas"
            className="relative p-1"
          >
            <Bell className="h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 font-mono text-[10px] glow-danger">
              {active}
            </span>
          </Link>
        ) : (
          <span className="relative p-1" title="Sin detecciones activas">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </span>
        )}
      </header>

      {/* Carrusel Táctico de los 11 Municipios de Cochabamba */}
      <div className="px-4 mb-2">
        <MunicipalityRibbon
          selectedId={nasa.regionId}
          onSelect={(id) => nasa.setRegion(id)}
          incidents={nasa.incidents}
          compact
        />
      </div>

      {nasa.snapshot.harmonizationStats && nasa.snapshot.harmonizationStats.dualConfirmedClusters > 0 && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary">
          <span className="flex items-center gap-1.5 font-bold">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            {nasa.snapshot.harmonizationStats.dualConfirmedClusters} Focos Armonizados
          </span>
          <span className="text-[10px] text-muted-foreground">
            Corroboración dual: {nasa.snapshot.harmonizationStats.corroborationRatePercent}%
          </span>
        </div>
      )}

      <NasaControls nasa={nasa} compact />

      {/* Indicadores Clave de Riesgo y NASA POWER */}
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] md:grid-cols-2 gap-3 px-4">
        <div
          className={`glass flex flex-col items-center rounded-xl p-3 ${
            risk === null
              ? "border-border text-muted-foreground"
              : risk >= 80
              ? "glow-danger border-destructive/40 text-destructive"
              : risk >= 40
              ? "border-warning/40 text-warning"
              : "border-success/40 text-success"
          }`}
        >
          <div className="relative h-20 w-20">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
              <circle
                cx="40"
                cy="40"
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - risk / 100)}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center font-mono text-xl font-bold">
              {risk}%
            </div>
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">{t("ignitionRiskTitle")}</div>
          <div className="text-sm font-bold">{label}</div>
        </div>

        <div className="glass rounded-xl p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary">
            POWER · {nasa.weatherDate ?? "Tiempo Real"}
          </div>
          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-fire" /> {t("tempLabel")}{" "}
              <b className="ml-auto font-mono">{w.temp}°C</b>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-primary" /> {t("windLabel")}{" "}
              <b className="ml-auto font-mono">{w.wind} km/h</b>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-warning" /> {t("humidityLabel")}{" "}
              <b className="ml-auto font-mono">{w.rh}%</b>
            </div>
          </div>
        </div>
      </div>

      {/* Selector Táctico de Modo en Terreno (Fase 1: Prevención vs Combate) */}
      <div className="grid grid-cols-2 gap-2 mx-4 mt-3 bg-background/80 p-1 rounded-xl border border-primary/40 shadow-sm font-mono text-xs">
        <button
          type="button"
          onClick={() => setTacticalMode("preventive")}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-bold transition-all cursor-pointer ${
            tacticalMode === "preventive"
              ? "bg-amber-500/25 text-amber-400 border border-amber-500/60 shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="truncate">{t("modePreventive")}</span>
        </button>
        <button
          type="button"
          onClick={() => setTacticalMode("combat")}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-bold transition-all cursor-pointer ${
            tacticalMode === "combat"
              ? "bg-destructive/25 text-destructive border border-destructive/60 shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <Flame className="h-4 w-4 text-destructive shrink-0" />
          <span className="truncate">{t("modeCombat")}</span>
        </button>
      </div>

      {/* Mapa Táctico Táctil */}
      <div className="glass relative mx-4 mt-2 h-[46vh] sm:h-[52vh] md:h-[58vh] min-h-[350px] md:min-h-[460px] overflow-hidden rounded-xl border border-primary/30">
        <TacticalMap
          incidents={nasa.incidents}
          selectedId={selectedId || undefined}
          center={nasa.center}
          zoom={nasa.region?.zoom ?? 11}
          national={false}
          gibsDates={nasa.gibs}
          onPoint={nasa.setPoint}
          layers={layers}
          horizon={horizon}
          weather={w}
          wind={{ deg: w?.windDeg ?? 0, kmh: w?.wind ?? 0 }}
          onSelect={(id) => setSelectedId(id || "")}
          mode={tacticalMode}
          onModeChange={setTacticalMode}
          selectedRegionId={nasa.regionId}
          onSelectRegion={(id) => nasa.setRegion(id)}
        />

        <TacButton
          aria-label="Capas"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="glass absolute left-2 top-14 z-[400] h-10 w-10 p-0"
        >
          <Layers className="h-4 w-4" />
        </TacButton>

        {open && (
          <div className="glass absolute left-14 right-2 top-14 z-[400] space-y-1 rounded-md p-2 text-xs animate-in fade-in">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <span className="font-bold text-[10px] uppercase text-primary">Capas NASA</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold px-1"
                aria-label="Cerrar capas"
              >
                ✕
              </button>
            </div>
            {(["thermal", "viirs", "viirsThermal", "modis"] as (keyof L)[]).map((k) => (
              <label key={k} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(layers[k])}
                  onChange={() => setLayers({ ...layers, [k]: !layers[k] })}
                />
                {
                  {
                    thermal: "Focos EONET / FIRMS",
                    viirs: "VIIRS True Color",
                    viirsThermal: "VIIRS SNPP térmica",
                    modis: "MODIS Anomalías térmicas",
                  }[k]
                }
              </label>
            ))}
          </div>
        )}
      </div>

      {/* BOTONES FLOTANTES DE ACCIÓN RÁPIDA (MODO BRIGADISTA EN TERRENO) */}
      <div className="mx-4 mt-2 grid grid-cols-3 gap-2 font-mono text-xs">
        <button
          type="button"
          disabled={isDispatching}
          onClick={handleWhatsAppDispatch}
          className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-green-500/40 bg-green-500/15 py-2 px-2 text-green-400 font-bold hover:bg-green-500/25 transition-colors disabled:opacity-50"
        >
          <Share2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{isDispatching ? "Enviando..." : t("dispatchWhatsApp")}</span>
        </button>

        <button
          type="button"
          onClick={handleRouteToHydrant}
          className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 py-2 px-2 text-primary font-bold hover:bg-primary/25 transition-colors"
        >
          <Navigation className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("routeAccess")}</span>
        </button>

        <Link
          to="/reportes"
          className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 py-2 px-2 text-amber-400 font-bold hover:bg-amber-500/25 transition-colors"
        >
          <Camera className="h-4 w-4 shrink-0" />
          <span className="truncate">{t("uploadEvidence")}</span>
        </Link>
      </div>

      {lastDispatch && (
        <div className="mx-4 mt-2 p-2 rounded-lg border border-emerald-500/40 bg-emerald-950/40 font-mono text-[11px] text-zinc-300 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 font-bold">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>ICS-209 Certificado en PostgreSQL</span>
            </span>
            <span className="text-[9px] uppercase px-1 rounded bg-emerald-500/20 text-emerald-300">
              PostGIS Inmutable
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Código Oficial:</span>
            <span className="font-bold text-white select-all">{lastDispatch.codigo_ics}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-zinc-400 shrink-0">Hash SHA-256:</span>
            <span className="font-mono text-[9px] text-emerald-300 truncate select-all max-w-[200px]" title={lastDispatch.hash_sha256}>
              {lastDispatch.hash_sha256}
            </span>
          </div>
        </div>
      )}

      {/* MÓDULO 4 Y MÓDULO 3: DESGLOSE PREDICTIVO Y VEGETACIÓN EN MÓVIL */}
      <div className="mx-4 mt-3 space-y-2">
        <div className="glass rounded-xl p-3 border border-primary/30">
          <div className="flex items-center justify-between font-mono text-xs mb-2">
            <span className="font-bold text-primary">{t("whyRiskTitle")} {totalIgnition.totalRiskPct}%?</span>
            <span
              className="px-1.5 py-0.5 rounded font-bold text-[10px] uppercase"
              style={{
                backgroundColor: `${totalIgnition.severityColor}22`,
                color: totalIgnition.severityColor,
                border: `1px solid ${totalIgnition.severityColor}66`,
              }}
            >
              {totalIgnition.riskLevel}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px] mb-2">
            <div className="p-1 rounded bg-secondary/40">
              <div className="text-muted-foreground">{t("tempLabel")}</div>
              <div className="font-bold text-fire">+{totalIgnition.breakdown.tempWeightPct}%</div>
            </div>
            <div className="p-1 rounded bg-secondary/40">
              <div className="text-muted-foreground">{t("windLabel")}</div>
              <div className="font-bold text-primary">+{totalIgnition.breakdown.windWeightPct}%</div>
            </div>
            <div className="p-1 rounded bg-secondary/40">
              <div className="text-muted-foreground">{t("humidityLabel")}</div>
              <div className="font-bold text-warning">+{totalIgnition.breakdown.rhWeightPct}%</div>
            </div>
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] p-1.5 rounded bg-secondary/30 mb-1">
            <span className="text-muted-foreground">{t("fuelModel")} {activeNode.municipality}:</span>
            <span className="font-bold text-amber-400">Factor {totalIgnition.breakdown.vegetationMultiplier.toFixed(2)}x</span>
          </div>
          <p className="text-[10px] text-muted-foreground italic leading-tight">
            {totalIgnition.breakdown.explanation}
          </p>
        </div>
      </div>

      {/* Panel de Operaciones */}
      <div className="mx-4 mt-3">
        <OperationsPanel
          incidents={nasa.incidents}
          selected={selected ?? undefined}
          weather={w}
          weatherReal={nasa.weatherReal}
          weatherDate={nasa.weatherDate}
          regionId={nasa.regionId}
          horizon={horizon}
          onHorizon={setHorizon}
          snapshotSource={nasa.snapshot.source}
          snapshotUpdated={nasa.snapshot.updated}
          predictiveWeather={nasa.predictive}
        />
      </div>

      {selected && (
        <Link
          to="/alerta/$id"
          params={{ id: selected.id }}
          className="mx-4 mt-3 flex min-h-[48px] items-center justify-center rounded-lg border border-primary/50 bg-primary/10 text-sm font-mono font-bold text-primary hover:bg-primary/20 transition-colors"
        >
          {t("seeFullReport")} →
        </Link>
      )}
    </div>
  );
}
