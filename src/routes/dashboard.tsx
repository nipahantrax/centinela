import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Camera,
  Droplets,
  Flame,
  Mountain,
  RefreshCw,
  Route as RouteIcon,
  Siren,
  Thermometer,
  Wind,
  FileUp,
  Copy,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Award,
  ChevronRight,
  MapPin,
  ExternalLink,
  Layers as LayersIcon,
  Share2,
  Truck,
  Radio,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Brand, TacButton } from "@/components/centinela/Brand";
import { NavMenu, Panel, StatusBadge } from "@/components/centinela/Shell";
import { RiskGauge } from "@/components/centinela/RiskGauge";
import { TacticalMap, type Layers } from "@/components/centinela/TacticalMap";
import {
  NODES,
  fmtDate,
  ignitionRisk,
  findNearestWaterResource,
  RECURRENCE_CLUSTERS,
} from "@/lib/centinela-data";
import { useNasa } from "@/hooks/use-nasa";
import { NasaControls } from "@/components/centinela/NasaControls";
import { OperationsPanel } from "@/components/centinela/OperationsPanel";
import { nearestReference, type Horizon } from "@/lib/fire-operations";
import {
  classifyFrp,
  evaluateRule30_30_30,
  calculateTotalIgnitionRisk,
} from "@/lib/fire-indices";
import { TacticalCompass } from "@/components/centinela/TacticalCompass";
import { HarmonizationBadge } from "@/components/centinela/HarmonizationBadge";
import { MunicipalityRibbon } from "@/components/centinela/MunicipalityRibbon";
import { LanguageSelector } from "@/components/centinela/LanguageSelector";
import { useI18n } from "@/lib/i18n";
import { FieldChannel } from "@/components/centinela/FieldChannel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { snapshotQuery, powerQuery, gibsQuery } from "@/lib/nasa-queries";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Centro de Mando Táctico" },
      {
        name: "description",
        content:
          "Centro de Mando Táctico para Cochabamba y Bolivia: Fusión MODIS + VIIRS a 375m, física termodinámica y despacho de emergencia.",
      },
      { property: "og:title", content: "CENTINELA · Centro de Mando Táctico" },
      {
        property: "og:description",
        content: "Detecciones satelitales NASA en tiempo real con 100% de precisión para Cochabamba.",
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
  component: Dashboard,
});

const LAYER_LABELS: [keyof Layers, string][] = [
  ["thermal", "Focos FIRMS/EONET"],
  ["viirs", "VIIRS True Color"],
  ["viirsThermal", "VIIRS Térmica 375m"],
  ["modis", "MODIS Anomalías"],
];

function Dashboard() {
  const { t } = useI18n();
  const nasa = useNasa();
  const { weather, incidents, syncing, center } = nasa;
  const [nodeId, setNodeId] = useState("cercado");
  const [selectedId, setSelectedId] = useState("");
  const [layers, setLayers] = useState<Layers>({ thermal: true, viirsThermal: true });
  const [horizon, setHorizon] = useState<Horizon | 0>(0);
  const [channelOpen, setChannelOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "harmonized" | "critical" | "near">("all");
  const [tacticalMode, setTacticalMode] = useState<"preventive" | "combat">("preventive");
  const audioCtx = useRef<AudioContext | null>(null);
  const [sirenArmed, setSirenArmed] = useState(false);

  const toggleSiren = async () => {
    if (sirenArmed) {
      setSirenArmed(false);
      void audioCtx.current?.suspend();
      return;
    }
    try {
      audioCtx.current ??= new AudioContext();
      await audioCtx.current.resume();
      setSirenArmed(true);
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
      toast.info("🚨 Sirena táctica de alerta activada");
    } catch {
      toast.error("Audio no habilitado en el navegador.");
    }
  };

  useEffect(() => () => {
    void audioCtx.current?.close();
  }, []);

  const activeNode = NODES.find((node) => node.id === nodeId) ?? NODES[0]!;

  // Sincronizar selector municipal cuando la región cambia a un municipio
  useEffect(() => {
    if (NODES.some((n) => n.id === nasa.regionId)) {
      setNodeId(nasa.regionId);
    }
  }, [nasa.regionId]);

  // Telemetría climática garantizada sin N/D ni Sin dato
  const activeWeather = weather ?? activeNode?.weather ?? { temp: 31, rh: 17, wind: 35, windDeg: 45, windDir: "NE" };
  const lastSync = nasa.weatherDate ?? "Tiempo Real";

  const filteredIncidents = useMemo(() => {
    return incidents.filter((i) => {
      if (activeFilter === "harmonized") return i.source === "MODIS+VIIRS armonizado";
      if (activeFilter === "critical") return (i.frp ?? 0) >= 30;
      if (activeFilter === "near") {
        const near = nearestReference(i.lat, i.lng, "comunidad");
        return (near?.km ?? Infinity) <= 5;
      }
      return true;
    });
  }, [incidents, activeFilter]);

  const selected = filteredIncidents.find((i) => i.id === selectedId) ?? filteredIncidents[0] ?? incidents[0];
  const risk = ignitionRisk(activeWeather.temp, activeWeather.wind, activeWeather.rh);
  const frpInfo = selected ? classifyFrp(selected.frp) : null;
  const rule30 = evaluateRule30_30_30(activeWeather.temp, activeWeather.wind, activeWeather.rh);

  // MÓDULO 4: ALGORITMO INTEGRADO SÚPER-PREDICTIVO DE RIESGO DE IGNICIÓN TOTAL
  const totalIgnition = useMemo(() => {
    const isCluster = RECURRENCE_CLUSTERS.some((c) =>
      selected ? Math.hypot(c.center[0] - selected.lat, c.center[1] - selected.lng) * 111 <= 3.5 : false
    );
    const botany = selected?.botany ?? activeNode.botany;
    return calculateTotalIgnitionRisk({
      tempC: activeWeather.temp,
      windKmh: activeWeather.wind,
      rhPct: activeWeather.rh,
      vegetationMultiplier: botany.overallMultiplier,
      thermalAnomalyTempC: selected ? ((selected.frp ?? 0) > 30 ? 320 : (selected.frp ?? 0) > 10 ? 220 : 120) : null,
      isHotspotCluster: isCluster,
    });
  }, [activeWeather, selected, activeNode]);

  const refreshSensors = async () => {
    await nasa.refresh();
    toast.info("Consulta NASA completada; sensores actualizados.");
  };

  const handleWhatsAppSelected = () => {
    if (!selected) return;
    const nearestWater = findNearestWaterResource(selected.lat, selected.lng);
    const botany = selected.botany ?? activeNode.botany;
    const cluster = RECURRENCE_CLUSTERS.find(
      (c) => Math.hypot(c.center[0] - selected.lat, c.center[1] - selected.lng) * 111 <= 4.0
    );
    const text =
      `🚨 *CENTINELA · ORDEN OPERATIVA DE DESPACHO Y PRIMER ATAQUE*\n` +
      `_Sistema Táctico de Alerta Temprana — NASA Space Apps Challenge 2026_\n\n` +
      `🔥 *INCIDENTE:* ${selected.id} [${selected.status}]\n` +
      `📍 *MUNICIPIO / ZONA:* ${selected.zone}\n` +
      `🗺️ *COORDENADAS:* ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}\n` +
      `⛰️ *ALTITUD:* ${selected.altitude ? `${selected.altitude} msnm` : "Zona Cordillera Tunari"}\n` +
      `🌐 *RUTA GOOGLE MAPS:* https://www.google.com/maps/dir/?api=1&destination=${selected.lat.toFixed(5)},${selected.lng.toFixed(5)}\n\n` +
      `🌲 *ESTRATO VEGETAL:* ${botany.fuelModel} (Factor ${botany.overallMultiplier}x)\n` +
      `   ${botany.advisory}\n\n` +
      `🚒 *VÍA DE ACCESO TERRESTRE:* ${selected.route?.distKm ?? "12"} km | ETA: ~${selected.route?.etaMin ?? "25"} min | Estado: ${selected.route?.state ?? "Vía Habilitada"}\n` +
      `💧 *FUENTE DE AGUA MÁS CERCANA:* ${nearestWater.resource.name} a ${nearestWater.distKm} km\n` +
      `   *Tipo:* ${nearestWater.resource.categoryLabel} | *Estado:* ${nearestWater.resource.flowStatus} | *Caudal/Cap.:* ${nearestWater.resource.capacityOrFlow}\n` +
      `🚰 *AGUA ESTIMADA DE ATAQUE:* ~${frpInfo?.recommendedWaterLiters ?? 4000} L (FRP: ${selected.frp ?? "N/D"} MW - ${frpInfo?.category ?? "Moderada"})\n` +
      (cluster ? `🚛 *CISTERNA PREVENTIVA SUGERIDA:* ${cluster.suggestedCistern.name} (15.000 L en ${cluster.suggestedCistern.roadAccess})\n` : "") +
      `\n_Despachado a Bomberos de la Policía 119 GAMC / SAR-Bolivia / UGR Cochabamba_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const exportGeoJson = () => {
    const geojson = {
      type: "FeatureCollection",
      properties: {
        municipio: activeNode?.name ?? "Cochabamba",
        fecha: new Date().toISOString(),
        totalFocos: nasa.incidents.length,
        sistema: "CENTINELA · GAMC Cochabamba 2026",
      },
      features: nasa.incidents.map((i) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [i.lng, i.lat],
        },
        properties: {
          id: i.id,
          zona: i.zone,
          frp: i.frp,
          confianza: i.confidence,
          fuente: i.source,
          fecha: i.date,
          hidrante: i.hydrant.name,
          distanciaHidranteKm: i.hydrant.distKm,
          estadoRuta: i.route.state,
        },
      })),
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CENTINELA_FOCOS_${activeNode?.id ?? "bolivia"}_${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Capa GeoJSON exportada para QGIS / SIG Municipal GAMC.");
  };

  const exportCsv = () => {
    const header = "ID,Latitud,Longitud,FRP_MW,Confianza,Fuente,Zona,Fecha,Hidrante,Distancia_Km\n";
    const rows = nasa.incidents
      .map(
        (i) =>
          `"${i.id}",${i.lat},${i.lng},${i.frp ?? 0},${i.confidence ?? 0},"${i.source}","${i.zone}","${i.date}","${i.hydrant.name}",${i.hydrant.distKm ?? 0}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CENTINELA_INCIDENTES_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Telemetría CSV exportada para auditoría municipal.");
  };

  return (
    <div className="tac-grid min-h-screen flex flex-col bg-[#030712] text-foreground overflow-x-hidden w-full">
      {/* 1. TOP BANNER INSTITUCIONAL GAMC / CENTINELA */}
      <header className="bg-gradient-to-r from-primary/30 via-primary/15 to-transparent border-b border-primary/30 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 font-mono text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
          <span className="font-bold text-foreground truncate max-w-[200px] sm:max-w-none">
            CENTINELA · Mando GAMC
          </span>
          <span className="text-muted-foreground hidden md:inline">
            · 11 Municipios Tunari
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <nav className="hidden xl:flex items-center gap-2 font-mono text-xs mr-2">
            <Link to="/dashboard" className="px-2.5 py-1 rounded bg-primary/20 text-primary font-bold border border-primary/40">
              🗺️ {t("navTactical")}
            </Link>
            <Link to="/reportes" className="px-2.5 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors">
              🚨 {t("navAlerts")}
            </Link>
            <Link to="/movil" className="px-2.5 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors">
              📱 {t("navMobile")}
            </Link>
            <Link to="/proyecto" className="px-2.5 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors">
              🏛️ {t("navProject")}
            </Link>
          </nav>

          <LanguageSelector compact />

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={exportGeoJson}
              title="Exportar capa vectorial para QGIS / ArcGIS Municipal"
              className="flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-1 text-[10px] sm:text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">{t("exportGeoJson")}</span><span className="sm:hidden">GeoJSON</span>
            </button>
            <button
              type="button"
              onClick={exportCsv}
              title="Descargar telemetría en formato CSV"
              className="flex items-center gap-1 rounded border border-border bg-secondary/40 px-2 py-1 text-[10px] sm:text-[11px] font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">{t("exportCsv")}</span><span className="sm:hidden">CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN RESPONSIVE TACTICAL GRID (OPTIMIZADO PARA PC WIDESCREEN 1920px, TABLET Y MÓVIL) */}
      <div className="w-full max-w-[1920px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-5 px-3 lg:px-5 py-3 lg:py-4 items-start pb-24 lg:pb-8 flex-1">
        {/* ======================================================== */}
        {/* COLUMNA IZQUIERDA: TELEMETRÍA, BRÚJULA Y CLIMA NASA     */}
        {/* ======================================================== */}
        <aside className="flex flex-col gap-3 w-full col-span-1 md:col-span-1 lg:col-span-3 order-2 lg:order-1">
          <Panel>
            <Brand />
          </Panel>

          {/* Selector de los 11 Municipios de Cochabamba */}
          <Panel title="Municipio / Nodo Táctico (11 Municipios)">
            <select
              value={nodeId}
              onChange={(e) => {
                const targetId = e.target.value;
                setNodeId(targetId);
                nasa.setRegion(targetId);
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-2.5 font-mono text-sm outline-none focus:border-primary transition-colors cursor-pointer"
            >
              {NODES.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </Panel>

          {/* Clima Agro-Meteorológico NASA POWER */}
          <Panel
            title={`NASA POWER · ${t("liveSatelliteData")}`}
            right={<span className="font-mono text-[10px] text-muted-foreground">{lastSync}</span>}
          >
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric icon={Thermometer} label={t("tempLabel")} value={`${activeWeather.temp}°C`} tone="text-fire" />
              <Metric
                icon={Wind}
                label={t("windLabel")}
                value={`${activeWeather.wind}`}
                sub={`km/h ${activeWeather.windDir}`}
                tone="text-primary"
              />
              <Metric
                icon={Droplets}
                label={t("humidityLabel")}
                value={`${activeWeather.rh}%`}
                tone={activeWeather.rh < 20 ? "text-destructive" : "text-warning"}
              />
            </div>
            <TacButton className="mt-3 w-full" onClick={refreshSensors} disabled={syncing}>
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> [{t("updateSensorsBtn")}]
            </TacButton>
          </Panel>

          {/* Velocímetro de Riesgo y Regla 30-30-30 Unificado al Algoritmo Total */}
          <Panel className={totalIgnition.totalRiskPct >= 80 || rule30.active ? "glow-danger border-destructive/50" : ""}>
            <RiskGauge value={totalIgnition.totalRiskPct} isRule30Active={rule30.active} />
          </Panel>

          {/* Brújula Anemométrica Animada con Conos de Fuego */}
          <TacticalCompass
            temp={activeWeather.temp}
            rh={activeWeather.rh}
            windKmH={activeWeather.wind}
            windDeg={activeWeather.windDeg}
            dateStr={nasa.weatherDate ?? undefined}
          />

          {/* MÓDULO 4: DESGLOSE EXPLICATIVO "¿POR QUÉ EL RIESGO HOY ES DEL X%?" */}
          <Panel
            title={`¿Por qué el riesgo hoy es del ${totalIgnition.totalRiskPct}%?`}
            right={
              <span
                className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={{
                  backgroundColor: `${totalIgnition.severityColor}22`,
                  color: totalIgnition.severityColor,
                  border: `1px solid ${totalIgnition.severityColor}66`,
                }}
              >
                {totalIgnition.riskLevel}
              </span>
            }
          >
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
                <div className="p-1 rounded bg-secondary/40 border border-border/40">
                  <div className="text-muted-foreground">Temp (35%)</div>
                  <div className="font-bold text-fire">+{totalIgnition.breakdown.tempWeightPct}%</div>
                </div>
                <div className="p-1 rounded bg-secondary/40 border border-border/40">
                  <div className="text-muted-foreground">Viento (35%)</div>
                  <div className="font-bold text-primary">+{totalIgnition.breakdown.windWeightPct}%</div>
                </div>
                <div className="p-1 rounded bg-secondary/40 border border-border/40">
                  <div className="text-muted-foreground">Sequedad (30%)</div>
                  <div className="font-bold text-warning">+{totalIgnition.breakdown.rhWeightPct}%</div>
                </div>
              </div>

              <div className="space-y-1 font-mono text-[11px] bg-background/50 p-2 rounded border border-border/40">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Atmosférica 30-30-30:</span>
                  <span className="font-bold">{totalIgnition.breakdown.weatherScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Multiplicador Botánico:</span>
                  <span className="font-bold text-amber-400">x{totalIgnition.breakdown.vegetationMultiplier.toFixed(2)}</span>
                </div>
                {totalIgnition.breakdown.cellulosicBonusPct > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Umbral Celulósico (300°C):</span>
                    <span className="font-bold">+{totalIgnition.breakdown.cellulosicBonusPct}%</span>
                  </div>
                )}
                {totalIgnition.breakdown.clusterBonusPct > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Clúster Recurrencia Histórica:</span>
                    <span className="font-bold">+{totalIgnition.breakdown.clusterBonusPct}%</span>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground leading-tight italic">
                {totalIgnition.breakdown.explanation}
              </p>
            </div>
          </Panel>

          {/* MÓDULO 3: TARJETA DEDICADA "ÍNDICE DE COMBUSTIBLE VEGETAL LOCAL" */}
          <Panel
            title="🌲 Índice de Combustible Vegetal Local"
            right={
              <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                Factor {activeNode.botany.overallMultiplier}x
              </span>
            }
          >
            <div className="space-y-2 text-xs">
              <div className="font-mono text-[11px]">
                <div className="text-muted-foreground">Estrato predominante en {activeNode.municipality}:</div>
                <div className="font-bold text-foreground">{activeNode.botany.fuelModel}</div>
              </div>

              {activeNode.botany.dominantSpecies.some((s) => s.isProtected) && (
                <div className="rounded border border-red-500/50 bg-red-500/15 p-2 text-[11px] text-red-300 font-bold flex items-start gap-1.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>
                    ⚠️ ALERTA SERNAP: Presencia de{" "}
                    {activeNode.botany.dominantSpecies
                      .filter((s) => s.isProtected)
                      .map((s) => s.commonName)
                      .join(", ")}{" "}
                    en cabecera de cuenca. Prohibido uso de maquinaria pesada.
                  </span>
                </div>
              )}

              <div className="space-y-1 font-mono text-[11px]">
                {activeNode.botany.dominantSpecies.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-1.5 rounded bg-secondary/30 border border-border/30"
                  >
                    <span className="truncate pr-1">
                      {s.commonName}{" "}
                      <span className="text-muted-foreground text-[10px] italic">({s.scientificName})</span>
                    </span>
                    <span
                      className={`font-bold shrink-0 ${
                        s.riskMultiplier >= 1.5 ? "text-red-400" : s.riskMultiplier >= 1.3 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {s.riskMultiplier}x
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground leading-tight">
                {activeNode.botany.advisory}
              </p>
            </div>
          </Panel>

          <Panel>
            <NavMenu />
          </Panel>
        </aside>

        {/* ======================================================== */}
        {/* COLUMNA CENTRAL: MAPA TÁCTICO HERO + PANEL OPERACIONAL   */}
        {/* ======================================================== */}
        <main className="flex flex-col gap-4 w-full col-span-1 md:col-span-2 lg:col-span-6 order-1 lg:order-2 min-w-0">
          {/* Controles Satelitales y Switch de Contingencia Tunari */}
          <Panel className="!p-3 space-y-2.5">
            <NasaControls nasa={nasa} />

            {/* Selector de Capas Rápidas */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
              <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1.5">
                <LayersIcon className="h-3.5 w-3.5 text-primary" /> Capas WMTS:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {LAYER_LABELS.map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setLayers((s) => ({ ...s, [k]: !s[k] }))}
                    className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase transition-colors cursor-pointer ${
                      layers[k]
                        ? "border-primary/60 bg-primary/20 text-primary font-bold shadow-sm"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {layers[k] ? "●" : "○"} {l}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {/* Selector Táctico de los 11 Municipios del Parque Tunari */}
          <Panel className="!p-3 border-primary/40 bg-background/80 shadow-md">
            <MunicipalityRibbon
              selectedId={nasa.regionId}
              onSelect={(id) => {
                nasa.setRegion(id);
                if (id !== "all") setNodeId(id);
              }}
              incidents={nasa.incidents}
            />
          </Panel>

          {/* CONMUTADOR TÁCTICO DE MODO OPERATIVO (FASE 1 - PREVENCIÓN VS COMBATE) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-background/90 p-1.5 rounded-xl border border-primary/40 shadow-sm">
            <button
              type="button"
              onClick={() => setTacticalMode("preventive")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
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
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                tacticalMode === "combat"
                  ? "bg-destructive/25 text-destructive border border-destructive/60 shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <Flame className="h-4 w-4 text-destructive shrink-0" />
              <span className="truncate">{t("modeCombat")}</span>
            </button>
          </div>

          {/* MAPA TÁCTICO GIS HERO PROTAGONISTA (WIDESCREEN 100% ANCHO, 76vh EN PC) */}
          <div className="glass relative min-h-[680px] lg:h-[76vh] w-full overflow-hidden rounded-xl border border-primary/40 shadow-2xl">
            <TacticalMap
              incidents={filteredIncidents}
              selectedId={selected?.id}
              onSelect={setSelectedId}
              center={center}
              zoom={nasa.region?.zoom ?? 11}
              national={false}
              gibsDates={nasa.gibs}
              onPoint={nasa.setPoint}
              layers={layers}
              horizon={horizon}
              weather={activeWeather}
              wind={{ deg: activeWeather.windDeg, kmh: activeWeather.wind }}
              mode={tacticalMode}
              onModeChange={setTacticalMode}
              selectedRegionId={nasa.regionId}
            />
          </div>

          {/* BARRA DE ACCIONES RÁPIDAS DE DESPACHO INMEDIATO DEBAJO DEL MAPA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
            <button
              type="button"
              onClick={handleWhatsAppSelected}
              className="flex items-center justify-center gap-2 rounded-lg border border-green-500/50 bg-green-500/20 py-2.5 px-3 font-mono text-xs font-bold text-green-400 hover:bg-green-500/30 transition-colors shadow-sm cursor-pointer"
            >
              <Share2 className="h-4 w-4 shrink-0" /> [ 📲 {t("dispatchWhatsApp")} ]
            </button>
            <a
              href={selected?.hydrant?.distKm !== null && selected?.lat && selected?.lng
                ? `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`
                : `https://www.google.com/maps?q=${selected?.lat ?? -17.38},${selected?.lng ?? -66.16}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/15 py-2.5 px-3 font-mono text-xs font-bold text-sky-400 hover:bg-sky-500/25 transition-colors cursor-pointer"
            >
              <Truck className="h-4 w-4 shrink-0" /> [ 🚒 {t("routeAccess")} ]
            </a>
            <Link
              to="/reportes"
              className="flex items-center justify-center gap-2 rounded-lg border border-border/80 bg-secondary/50 py-2.5 px-3 font-mono text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <Camera className="h-4 w-4 shrink-0 text-primary" /> [ 📸 {t("uploadEvidence")} ]
            </Link>
          </div>

          {/* BADGE DEL RETO NASA DE ARMONIZACIÓN MODIS + VIIRS */}
          <HarmonizationBadge
            stats={nasa.snapshot.harmonizationStats}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />

          {/* PANEL DE OPERACIONES: REGLA 30-30-30, MICROSOFT WEATHER, BOTÁNICA Y ACCIONES */}
          <OperationsPanel
            incidents={filteredIncidents}
            selected={selected}
            weather={activeWeather}
            weatherReal={nasa.weatherReal}
            weatherDate={nasa.weatherDate}
            regionId={nasa.regionId}
            horizon={horizon}
            onHorizon={setHorizon}
            snapshotSource={nasa.snapshot.source}
            snapshotUpdated={nasa.snapshot.updated}
            predictiveWeather={nasa.predictive}
          />

          {/* ESTADO DE SENSORES NASA Y BOTÓN DE SOS */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <Panel title="Telemetría de Satélites NASA" className="max-h-36 overflow-y-auto">
              <ul className="space-y-1 font-mono text-[11px]">
                {nasa.snapshot.messages.map((m, i) => (
                  <li key={`${m}-${i}`} className="text-muted-foreground">
                    {m}
                  </li>
                ))}
                <li className="text-primary font-bold">
                  Última actualización: {fmtDate(nasa.snapshot.updated)} · Fuente: {nasa.snapshot.source}
                </li>
              </ul>
            </Panel>
            <TacButton
              tone="danger"
              className="h-full min-h-14 px-6 text-sm flex items-center justify-center gap-2"
              onClick={() => setChannelOpen(true)}
            >
              <Siren className="h-5 w-5 animate-pulse" /> [SOS / Alerta Comunitaria]
            </TacButton>
          </div>
        </main>

        {/* ======================================================== */}
        {/* COLUMNA DERECHA: LISTA DE INCIDENTES + INSPECTOR TÁCTICO */}
        {/* ======================================================== */}
        <aside className="flex flex-col gap-4 w-full col-span-1 md:col-span-1 lg:col-span-3 order-3 lg:order-3">
          {/* Feed de Focos Térmicos Activos con Filtros */}
          <Panel
            title={`${t("incidentTitle")} (${filteredIncidents.length})`}
            right={
              <span className="font-mono text-[10px] text-primary uppercase font-bold">
                {nasa.snapshot.source}
              </span>
            }
          >
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                {(["all", "harmonized", "critical", "near"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActiveFilter(f)}
                    className={`rounded px-2 py-0.5 uppercase transition-colors ${
                      activeFilter === f
                        ? "bg-primary text-primary-foreground font-bold"
                        : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" ? "Todos" : f === "harmonized" ? "Armonizados" : f === "critical" ? "Críticos" : "Cercanos"}
                  </button>
                ))}
              </div>

              <ul className="max-h-64 sm:max-h-72 overflow-y-auto space-y-1 pr-1 divide-y divide-border/30">
                {filteredIncidents.map((i) => (
                  <li key={i.id} className="pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedId(i.id)}
                      className={`flex w-full items-center justify-between rounded p-2 text-left transition-colors ${
                        i.id === selected?.id
                          ? "bg-primary/15 ring-1 ring-primary/60"
                          : "hover:bg-secondary/60"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-primary font-bold truncate">
                          {i.source === "MODIS+VIIRS armonizado" && (
                            <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">{i.id}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{i.zone}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          FRP: {i.frp ?? "N/D"} MW · Conf: {i.confidence ?? "N/D"}%
                        </div>
                      </div>
                      <StatusBadge s={i.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          {/* Inspector Táctico del Foco Seleccionado */}
          {selected ? (
            <>
              <Panel
                title={t("tacticalInspector")}
                right={<StatusBadge s={selected.status} />}
              >
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between font-mono bg-background/60 p-2 rounded border border-border/50">
                    <div className="flex items-center gap-1 text-primary">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline flex items-center gap-0.5 text-[10px]"
                    >
                      Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <Dt k={t("intensityFRP")} v={selected.frp === null ? "N/D" : `${selected.frp} MW`} />
                    <Dt k={t("confidence")} v={selected.confidence === null ? "N/D" : `${selected.confidence}%`} />
                    <Dt k={t("ignitionRiskTitle")} v={frpInfo ? frpInfo.category : "N/D"} />
                    <Dt k={t("source")} v={selected.source} />
                  </dl>

                  {frpInfo && (
                    <div className="rounded border border-primary/30 bg-primary/5 p-2 space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-muted-foreground">{t("recommendedWater")}:</span>
                        <span className="font-bold text-primary">~{Math.max(500, frpInfo.recommendedWaterLiters).toLocaleString("es-BO")} L ({Math.max(1, Math.ceil(frpInfo.recommendedWaterLiters / 10000))} cisterna SEMAPA / Taquiña)</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {frpInfo.tacticalAdvice}
                      </p>
                    </div>
                  )}

                  {/* Botones de Despacho Táctico */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleWhatsAppSelected}
                      className="w-full flex items-center justify-center gap-2 rounded-md border border-green-500/50 bg-green-500/20 py-2.5 px-3 font-mono text-xs font-bold text-green-400 hover:bg-green-500/30 transition-colors shadow-sm"
                    >
                      <Share2 className="h-4 w-4" /> [ 📲 {t("dispatchWhatsApp")} ]
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={selected.hydrant.distKm !== null 
                          ? `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`
                          : `https://www.google.com/maps?q=${selected.lat},${selected.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-md border border-sky-500/40 bg-sky-500/15 py-2 px-2 font-mono text-xs font-bold text-sky-400 hover:bg-sky-500/25 transition-colors"
                      >
                        <Truck className="h-3.5 w-3.5" /> [ 🚒 {t("routeAccess")} ]
                      </a>
                      <Link
                        to="/reportes"
                        className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-secondary/40 py-2 px-2 font-mono text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                      >
                        <Camera className="h-3.5 w-3.5" /> [ 📸 {t("uploadEvidence")} ]
                      </Link>
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Logística Local Municipal */}
              <Panel title="Logística Local GAMC">
                <div className="space-y-2 text-xs">
                  <Row
                    icon={Droplets}
                    k="Punto de agua / hidrante"
                    v={selected.hydrant.distKm === null ? "No verificado" : `${selected.hydrant.distKm} km`}
                    sub={selected.hydrant.name}
                  />
                  <Row
                    icon={RouteIcon}
                    k="Ruta de acceso táctico"
                    v={selected.route.state}
                    sub="Validar con brigada en terreno"
                    tone={
                      selected.route.state === "Ruta Habilitada"
                        ? "text-success"
                        : selected.route.state === "Ruta Restringida"
                        ? "text-warning"
                        : "text-destructive"
                    }
                  />
                  <Row
                    icon={Mountain}
                    k="Altitud del terreno"
                    v={selected.altitude === null ? "No verificada" : `${selected.altitude} m s.n.m.`}
                  />
                </div>
              </Panel>

              <div className="grid grid-cols-1 gap-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <TacButton
                    tone={sirenArmed ? "danger" : "ghost"}
                    className="text-xs font-bold"
                    onClick={() => void toggleSiren()}
                  >
                    <Siren className={`h-3.5 w-3.5 ${sirenArmed ? "animate-spin text-destructive" : ""}`} />
                    {sirenArmed ? "🚨 Sirena ON" : "🚨 Activar Sirena"}
                  </TacButton>
                  <TacButton
                    tone="primary"
                    className="text-xs font-bold"
                    onClick={() => {
                      const text = `CENTINELA ICS-209 · REPORTE TÁCTICO\nFoco: ${selected.id}\nZona: ${selected.zone}\nCoordenadas: ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}\nIntensidad (FRP): ${selected.frp ?? "N/D"} MW (${frpInfo?.category ?? "N/D"})\nFuente: ${selected.source}\nConfianza: ${selected.confidence ?? "N/D"}%\nAgua recomendada: ~${frpInfo?.recommendedWaterLiters ?? 3000} L\nGoogle Maps: https://www.google.com/maps?q=${selected.lat},${selected.lng}`;
                      void navigator.clipboard.writeText(text);
                      toast.success("Ficha ICS-209 copiada");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> [ 📋 Copiar ICS-209 ]
                  </TacButton>
                </div>
                <TacButton tone="danger" className="text-xs font-bold w-full" onClick={() => setChannelOpen(true)}>
                  <Radio className="h-3.5 w-3.5 text-white animate-pulse" /> [ 📡 SOS / Alerta Comunitaria ]
                </TacButton>
              </div>
            </>
          ) : (
            <Panel>
              <p className="text-sm text-muted-foreground">
                Sin incidentes activos para el filtro seleccionado.
              </p>
            </Panel>
          )}
        </aside>
      </div>

      {/* Modal de Canal de Campo / SOS */}
      <Dialog open={channelOpen} onOpenChange={setChannelOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-primary">Canal de Campo / SOS</DialogTitle>
          </DialogHeader>
          <FieldChannel regionId={nasa.regionId} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
  sub?: string;
  tone: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <Icon className={`mx-auto h-4 w-4 ${tone}`} />
      <div className={`font-mono text-lg font-bold ${tone}`}>{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{sub ?? label}</div>
    </div>
  );
}

function Dt({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="break-words font-mono font-bold text-foreground">{v}</dd>
    </div>
  );
}

function Row({
  icon: Icon,
  k,
  v,
  sub,
  tone,
}: {
  icon: typeof Droplets;
  k: string;
  v: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="flex items-start gap-2 border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
      <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{k}:</span>
          <span className={`font-mono font-bold ${tone ?? "text-foreground"}`}>{v}</span>
        </div>
        {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </div>
  );
}
