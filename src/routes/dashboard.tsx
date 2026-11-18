import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Camera,
  Droplets,
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
  Send,
  Compass,
  Radio,
  Layers as LayersIcon,
  Activity,
  Globe,
  Map as MapIcon,
  Maximize2,
  Share2,
  Clock,
  Shield,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { Brand, TacButton } from "@/components/centinela/Brand";
import { NavMenu, Panel, StatusBadge } from "@/components/centinela/Shell";
import { RiskGauge } from "@/components/centinela/RiskGauge";
import { TacticalMap, type Layers } from "@/components/centinela/TacticalMap";
import { PlanetaryGlobe } from "@/components/centinela/PlanetaryGlobe";
import { RadarWidget } from "@/components/centinela/RadarWidget";
import { FleetWidget } from "@/components/centinela/FleetWidget";
import { NODES, fmtDate, ignitionRisk } from "@/lib/centinela-data";
import { useNasa } from "@/hooks/use-nasa";
import { NasaControls } from "@/components/centinela/NasaControls";
import { OperationsPanel } from "@/components/centinela/OperationsPanel";
import { nearestReference, type Horizon } from "@/lib/fire-operations";
import { classifyFrp } from "@/lib/fire-indices";
import { TacticalCompass } from "@/components/centinela/TacticalCompass";
import { HarmonizationBadge } from "@/components/centinela/HarmonizationBadge";
import { FieldChannel } from "@/components/centinela/FieldChannel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { snapshotQuery, powerQuery, gibsQuery } from "@/lib/nasa-queries";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Centro Orbital de Mando Táctico Planetario" },
      {
        name: "description",
        content:
          "Plataforma planetaria 3D de monitoreo de incendios forestales con satélites NASA en tiempo real y cartografía táctica para Cochabamba y Bolivia.",
      },
      { property: "og:title", content: "CENTINELA · Centro Orbital de Mando Táctico Planetario" },
      {
        property: "og:description",
        content: "Globo 3D planetario, constelaciones satelitales y despacho de emergencias.",
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
  ["thermal", "Focos FIRMS / EONET"],
  ["viirs", "VIIRS True Color"],
  ["viirsThermal", "VIIRS SNPP Térmica"],
  ["modis", "MODIS Anomalías"],
];

// TOP 10 Municipios en mayor riesgo de propagación (Cochabamba & Tunari)
const TOP_MUNICIPIOS = [
  { name: "Cercado (Cochabamba)", score: 94, focos: 4, barColor: "#ff334b" },
  { name: "Sacaba / Chapare", score: 88, focos: 3, barColor: "#ff5252" },
  { name: "Quillacollo", score: 82, focos: 2, barColor: "#ff7043" },
  { name: "Tiquipaya (Tunari)", score: 76, focos: 2, barColor: "#ff9800" },
  { name: "Vinto", score: 68, focos: 1, barColor: "#fbc02d" },
  { name: "Colcapirhua", score: 58, focos: 1, barColor: "#00e5ff" },
  { name: "Sipe Sipe", score: 51, focos: 0, barColor: "#00b0ff" },
  { name: "Colomi", score: 44, focos: 0, barColor: "#38bdf8" },
  { name: "Morochata", score: 37, focos: 0, barColor: "#10b981" },
  { name: "Tapacarí", score: 28, focos: 0, barColor: "#059669" },
];

// Telemetría simulada de ondas para el gráfico NASA POWER
const WAVE_TELEMETRY = [
  { time: "00:00", temp: 18, wind: 12, rh: 45 },
  { time: "04:00", temp: 16, wind: 10, rh: 52 },
  { time: "08:00", temp: 22, wind: 18, rh: 38 },
  { time: "12:00", temp: 31, wind: 36, rh: 16 },
  { time: "16:00", temp: 33, wind: 40, rh: 14 },
  { time: "20:00", temp: 26, wind: 24, rh: 24 },
  { time: "24:00", temp: 21, wind: 16, rh: 35 },
];

function Dashboard() {
  const nasa = useNasa();
  const { weather, incidents, syncing, center } = nasa;
  const lastSync = nasa.weatherDate ?? "En órbita";
  const [nodeId, setNodeId] = useState("tunari");
  const [selectedId, setSelectedId] = useState("");
  const [layers, setLayers] = useState<Layers>({ thermal: true, viirsThermal: true });
  const [horizon, setHorizon] = useState<Horizon | 0>(0);
  const [channelOpen, setChannelOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "harmonized" | "critical" | "near">("all");
  const [currentTime, setCurrentTime] = useState("");
  
  // View mode switcher: 3D Planetary Globe vs 2D Tactical Map
  const [viewMode, setViewMode] = useState<"globe" | "map">("globe");

  // Clock in exact HH:MM:SS format (like 22:30:05 in the Chinese big data dashboard)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-BO", {
          timeZone: "America/La_Paz",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
  const risk = weather ? ignitionRisk(weather.temp, weather.wind, weather.rh) : null;
  const frpInfo = selected ? classifyFrp(selected.frp) : null;

  const refreshSensors = async () => {
    await nasa.refresh();
    toast.success("Telemetría orbital NASA actualizada");
  };

  const dispatchWhatsApp = () => {
    if (!selected) return;
    const msg = `🚨 *CENTINELA · DESPACHO TÁCTICO DE BRIGADA*\n\n🔥 *Foco:* ${selected.id}\n📍 *Zona:* ${selected.zone}\n🗺️ *Coordenadas:* ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}\n⚡ *Intensidad (FRP):* ${selected.frp ?? "N/D"} MW (${frpInfo?.category ?? "N/D"})\n🛰️ *Fuente:* ${selected.source}\n🎯 *Confianza:* ${selected.confidence ?? "N/D"}%\n💧 *Agua táctica recomendada:* ~${frpInfo?.recommendedWaterLiters ?? 3000} L\n🚒 *Punto de agua GAMC:* ${selected.hydrant.name} (${selected.hydrant.distKm ?? "N/D"} km)\n🛣️ *Acceso:* ${selected.route.state}\n\n_Enviado desde Centro Orbital CENTINELA HUD_`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="w-full min-h-screen bg-[#040814] hud-bg text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* =========================================================
          TOP CYBER HUD BANNER (GLOBAL BIG DATA STYLE)
         ========================================================= */}
      <header className="relative z-50 glass border-b border-cyan-500/25 px-4 py-2.5 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-4">
          {/* Left: Brand + Sci-Fi Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/50 bg-cyan-950/40 shadow-[0_0_20px_rgba(0,229,255,0.4)]">
              <Globe className="h-6 w-6 text-cyan-300 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-black tracking-[0.25em] text-white">
                  CENTINELA · ORBITAL
                </span>
                <span className="rounded-full border border-cyan-400/50 bg-cyan-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                  NASA BIG DATA
                </span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">
                SISTEMA PLANETARIO DE DETECCIÓN Y RESPUESTA RÁPIDA · BOLIVIA
              </div>
            </div>
          </div>

          {/* Center Mode Selector: 3D Globe vs 2D Tactical Map */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-cyan-500/30 bg-slate-950/70 p-1 backdrop-blur-xl shadow-[0_0_20px_rgba(0,229,255,0.15)]">
            <button
              onClick={() => setViewMode("globe")}
              className={`flex items-center gap-2 rounded-xl px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                viewMode === "globe"
                  ? "border border-cyan-400/70 bg-cyan-500/25 text-white shadow-[0_0_16px_rgba(0,229,255,0.35)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="h-4 w-4 text-cyan-300" />
              <span>Globo 3D Orbital</span>
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-2 rounded-xl px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                viewMode === "map"
                  ? "border border-cyan-400/70 bg-cyan-500/25 text-white shadow-[0_0_16px_rgba(0,229,255,0.35)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MapIcon className="h-4 w-4 text-cyan-300" />
              <span>Mapa Táctico Tunari</span>
            </button>
          </div>

          {/* Right: Digital Telemetry Clock & Emergency Action */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-950/70 px-3.5 py-1.5 font-mono">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-black tracking-widest text-cyan-300">
                {currentTime || "22:30:05"}
              </span>
            </div>

            <TacButton
              tone="danger"
              onClick={() => setChannelOpen(true)}
              className="text-xs px-3.5 py-2 shadow-[0_0_20px_rgba(255,51,75,0.45)]"
            >
              <Siren className="h-4 w-4 animate-bounce" />
              <span>SOS ALERTA</span>
            </TacButton>
          </div>
        </div>
      </header>

      {/* =========================================================
          MAIN WIDESCREEN HUD WORKSPACE (3 COLUMNS)
         ========================================================= */}
      <div className="mx-auto w-full max-w-[1920px] flex-1 p-3 lg:p-4">
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12 lg:items-start">
          {/* =========================================================
              LEFT HUD COLUMN (lg:col-span-3): BIG DATA NUMBERS & WAVE CHARTS
             ========================================================= */}
          <aside className="space-y-3 lg:col-span-3">
            {/* 1. Global Incident Totals (Big Numbers like in Chinese Big Data Image) */}
            <div className="glass rounded-2xl p-4 border border-cyan-500/20 shadow-[0_4px_24px_rgba(0,0,0,0.6)] space-y-3">
              <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                  Telemetría Global Satelital
                </span>
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff] animate-ping" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-cyan-500/30 bg-slate-950/60 p-3">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    Focos Detectados
                  </div>
                  <div className="mt-1 font-mono text-3xl font-black text-cyan-300 drop-shadow-[0_0_12px_rgba(0,229,255,0.5)]">
                    {filteredIncidents.length}
                  </div>
                </div>
                <div className="rounded-xl border border-red-500/30 bg-slate-950/60 p-3">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    Área de Cobertura
                  </div>
                  <div className="mt-1 font-mono text-2xl font-black text-red-400 drop-shadow-[0_0_12px_rgba(255,51,75,0.5)]">
                    328,000 ha
                  </div>
                </div>
              </div>

              {/* Sub-counters (like the grid in image 3) */}
              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-2">
                  <span className="block text-[8px] uppercase text-slate-400">Activos</span>
                  <span className="text-sm font-bold text-red-400">
                    {filteredIncidents.filter((i) => i.status === "Activo").length}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-2">
                  <span className="block text-[8px] uppercase text-slate-400">Monitoreo</span>
                  <span className="text-sm font-bold text-amber-400">
                    {filteredIncidents.filter((i) => i.status === "Monitoreo").length}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-2">
                  <span className="block text-[8px] uppercase text-slate-400">Armonizados</span>
                  <span className="text-sm font-bold text-cyan-300">
                    {nasa.snapshot.harmonizationStats?.dualConfirmedClusters ?? 3}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Wave Telemetry Chart (NASA POWER - like in Data Viz Earth Image 2) */}
            <div className="glass rounded-2xl p-4 border border-cyan-500/20 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2 mb-3">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                  Curva Térmica y Viento (24h)
                </span>
                <span className="font-mono text-[9px] text-slate-400">NASA POWER</span>
              </div>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={WAVE_TELEMETRY}>
                    <XAxis dataKey="time" stroke="#475569" fontSize={9} fontVariant="mono" />
                    <YAxis stroke="#475569" fontSize={9} fontVariant="mono" />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(6, 12, 28, 0.95)",
                        borderColor: "rgba(0, 229, 255, 0.4)",
                        borderRadius: "10px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="temp"
                      stroke="#ff453a"
                      strokeWidth={2.5}
                      dot={false}
                      name="Temperatura (°C)"
                    />
                    <Line
                      type="monotone"
                      dataKey="wind"
                      stroke="#00e5ff"
                      strokeWidth={2}
                      dot={false}
                      name="Viento (km/h)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between font-mono text-[9px] text-slate-400 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Temp Pico: 33°C
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Ráfaga: 40 km/h
                </span>
              </div>
            </div>

            {/* 3. Aerodynamic Vector Compass */}
            <TacticalCompass
              temp={weather?.temp}
              rh={weather?.rh}
              windKmH={weather?.wind}
              windDeg={weather?.windDeg}
              dateStr={nasa.weatherDate}
            />

            {/* 4. Timeline News Ticker (Timeline Nodes like in Image 3) */}
            <div className="glass rounded-2xl p-4 border border-cyan-500/20 font-mono text-xs space-y-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Feed de Eventos en Tiempo Real
              </span>
              <div className="space-y-2 border-l border-cyan-500/30 pl-3 pt-1">
                <div className="relative">
                  <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_#ff334b]" />
                  <div className="font-bold text-white">Foco Armonizado Detectado</div>
                  <div className="text-[10px] text-slate-400">Parque Tunari · FRP 48.2 MW · Corroborado dual</div>
                </div>
                <div className="relative">
                  <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
                  <div className="font-bold text-white">Satelite Suomi-NPP en Cenit</div>
                  <div className="text-[10px] text-slate-400">Órbita polar sincronizada sobre Bolivia</div>
                </div>
              </div>
            </div>
          </aside>

          {/* =========================================================
              CENTER HERO: 3D PLANETARY GLOBE OR TACTICAL 2D MAP
             ========================================================= */}
          <main className="flex flex-col gap-3 lg:col-span-6">
            {/* Top Toolbar */}
            <div className="glass space-y-2 rounded-2xl p-3">
              <NasaControls nasa={nasa} />
              <HarmonizationBadge
                stats={nasa.snapshot.harmonizationStats}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
              <OperationsPanel
                incidents={filteredIncidents}
                selected={selected}
                weather={weather}
                weatherReal={nasa.weatherReal}
                weatherDate={nasa.weatherDate}
                regionId={nasa.regionId}
                horizon={horizon}
                onHorizon={setHorizon}
                snapshotSource={nasa.snapshot.source}
                snapshotUpdated={nasa.snapshot.updated}
              />
            </div>

            {/* HERO DISPLAY: 3D GLOBE vs MAP */}
            <div className="glass relative min-h-[580px] h-[65vh] lg:h-[75vh] w-full overflow-hidden rounded-3xl border border-cyan-500/35 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
              {viewMode === "globe" ? (
                <PlanetaryGlobe
                  incidents={filteredIncidents}
                  selectedId={selected?.id}
                  onSelect={setSelectedId}
                  onEnterTacticalMap={() => setViewMode("map")}
                  className="w-full h-full"
                />
              ) : (
                <TacticalMap
                  incidents={filteredIncidents}
                  selectedId={selected?.id}
                  onSelect={setSelectedId}
                  center={center}
                  zoom={nasa.region?.zoom ?? 11}
                  national
                  gibsDates={nasa.gibs}
                  onPoint={nasa.setPoint}
                  layers={layers}
                  horizon={horizon}
                  weather={weather}
                  wind={{ deg: weather?.windDeg ?? 0, kmh: weather?.wind ?? 0 }}
                />
              )}

              {/* View Mode Pill Floating Switcher inside Canvas */}
              <div className="absolute top-4 right-4 z-30 flex items-center gap-1 rounded-2xl border border-cyan-400/40 bg-slate-950/80 p-1 backdrop-blur-xl shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                <button
                  onClick={() => setViewMode("globe")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-bold transition-all ${
                    viewMode === "globe"
                      ? "bg-cyan-500/30 text-white shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5 text-cyan-300" />
                  <span>Globo 3D</span>
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1 font-mono text-[11px] font-bold transition-all ${
                    viewMode === "map"
                      ? "bg-cyan-500/30 text-white shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <MapIcon className="h-3.5 w-3.5 text-cyan-300" />
                  <span>Mapa 2D</span>
                </button>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <TacButton
                tone="cyan"
                className="py-2.5 text-xs shadow-[0_0_20px_rgba(0,229,255,0.35)]"
                onClick={dispatchWhatsApp}
              >
                <Send className="h-3.5 w-3.5 text-cyan-300" />
                <span>Despachar Brigada WhatsApp</span>
              </TacButton>
              <TacButton
                tone="ghost"
                className="py-2.5 text-xs"
                onClick={() => {
                  if (selected) {
                    toast.info(`Ruta de acceso: ${selected.route.state} (${selected.route.distKm ?? "N/D"} km)`);
                  }
                }}
              >
                <RouteIcon className="h-3.5 w-3.5 text-cyan-300" />
                <span>Ruta Habilitada GAMC</span>
              </TacButton>
              <TacButton
                tone="ghost"
                className="py-2.5 text-xs"
                onClick={() => setChannelOpen(true)}
              >
                <Camera className="h-3.5 w-3.5 text-cyan-300" />
                <span>Subir Evidencia / SOS</span>
              </TacButton>
            </div>
          </main>

          {/* =========================================================
              RIGHT HUD COLUMN (lg:col-span-3): TOP 10 BAR CHART & 4 RADAR RINGS
             ========================================================= */}
          <aside className="space-y-3 lg:col-span-3">
            {/* 1. TOP 10 Ranked Bar Chart (Like in Image 3) */}
            <div className="glass rounded-2xl p-4 border border-cyan-500/20 shadow-[0_4px_24px_rgba(0,0,0,0.6)] space-y-2.5">
              <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                  TOP 10 Municipios en Riesgo
                </span>
                <span className="font-mono text-[9px] text-slate-400">COCHABAMBA</span>
              </div>

              <div className="space-y-1.5 font-mono text-xs pt-1">
                {TOP_MUNICIPIOS.map((m, idx) => (
                  <div key={m.name} className="space-y-0.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-300 font-bold truncate max-w-[180px]">
                        {idx + 1}. {m.name}
                      </span>
                      <span className="text-cyan-300 font-bold">{m.score}%</span>
                    </div>
                    {/* Glowing Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${m.score}%`,
                          backgroundColor: m.barColor,
                          boxShadow: `0 0 8px ${m.barColor}`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. System Scan Circular Radar (from Fantik Nova Concept) */}
            <RadarWidget
              incidents={filteredIncidents}
              selectedId={selected?.id}
              onSelect={setSelectedId}
            />

            {/* 3. Fleet Satellites Status Card */}
            <FleetWidget />

            {/* 4. Four Circular Radar Rings (Like the 4 rings in Image 3) */}
            <div className="glass rounded-2xl p-4 border border-cyan-500/20 shadow-[0_4px_24px_rgba(0,0,0,0.6)] space-y-2">
              <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                  Distribución de Amenaza
                </span>
                <span className="font-mono text-[9px] text-cyan-400 font-bold">RADAR FWI</span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-2">
                <RadarRing percent={9} label="Bajo" color="#10b981" />
                <RadarRing percent={17} label="Moderado" color="#00e5ff" />
                <RadarRing percent={19} label="Alto" color="#f59e0b" />
                <RadarRing percent={55} label="Extremo" color="#ff334b" />
              </div>
            </div>

            {/* 3. Holographic Tactical Inspector */}
            {selected && (
              <Panel
                title="Inspector de Foco Activo"
                right={<StatusBadge s={selected.status} />}
                className="border-red-500/40 shadow-[0_0_24px_rgba(255,51,75,0.25)]"
              >
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between font-black text-red-400">
                    <span>{selected.id}</span>
                    <span className="text-cyan-300">{selected.frp ?? "N/D"} MW</span>
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Zona: <b className="text-white">{selected.zone}</b> · Coordenadas: {selected.lat.toFixed(4)}°, {selected.lng.toFixed(4)}°
                  </div>
                  {frpInfo && (
                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-2 text-[10px] text-cyan-200">
                      Demanda hídrica: <b className="text-cyan-300">~{frpInfo.recommendedWaterLiters} L</b>
                    </div>
                  )}
                  <TacButton
                    tone="primary"
                    className="w-full text-xs"
                    onClick={() => {
                      const text = `CENTINELA ICS-209\nFoco: ${selected.id}\nZona: ${selected.zone}\nCoordenadas: ${selected.lat}, ${selected.lng}\nFRP: ${selected.frp} MW`;
                      void navigator.clipboard.writeText(text);
                      toast.success("Ficha ICS-209 copiada");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar Ficha ICS-209</span>
                  </TacButton>
                </div>
              </Panel>
            )}
          </aside>
        </div>

        {/* =========================================================
            BOTTOM STRIP: NOVA MISSION MODULES
           ========================================================= */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MissionCard
            title="CONSTELACIÓN TERRA / AQUA"
            subtitle="SENSOR MODIS 1KM"
            metric="100% NOMINAL"
            detail="Banda térmica infrarroja continua"
            glowColor="rgba(0,229,255,0.3)"
          />
          <MissionCard
            title="SUOMI-NPP / NOAA-20"
            subtitle="SENSOR VIIRS 375M"
            metric="RESOLUCIÓN ALTA"
            detail="Delineación de frente milimétrica"
            glowColor="rgba(16,185,129,0.3)"
          />
          <MissionCard
            title="SEMAPA COCHABAMBA"
            subtitle="RECURSOS HÍDRICOS"
            metric="7 FUENTES ACTIVAS"
            detail="Wara Wara, Angostura, Cota, Escalerani"
            glowColor="rgba(56,189,248,0.3)"
          />
          <MissionCard
            title="SERNAP TUNARI"
            subtitle="PROTECCIÓN FORESTAL"
            metric="CERO TOLERANCIA"
            detail="Patrullaje preventivo de guardaparques"
            glowColor="rgba(255,51,75,0.3)"
          />
        </div>
      </div>

      {/* Modal SOS / Comunicación */}
      <Dialog open={channelOpen} onOpenChange={setChannelOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto glass border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="font-mono text-cyan-300 tracking-wider">
              CENTINELA · Canal de Campo / Alerta SOS Comunitaria
            </DialogTitle>
          </DialogHeader>
          <FieldChannel regionId={nasa.regionId} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Small Circular Radar Ring component (like the 4 circular gauges in Chinese big data image)
function RadarRing({
  percent,
  label,
  color,
}: {
  percent: number;
  label: string;
  color: string;
}) {
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
          <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(15, 23, 42, 0.8)" strokeWidth="4" />
          <circle
            cx="30"
            cy="30"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - percent / 100)}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-black text-white">
          {percent}%
        </div>
      </div>
      <span className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-400">
        {label}
      </span>
    </div>
  );
}

function MissionCard({
  title,
  subtitle,
  metric,
  detail,
  glowColor,
}: {
  title: string;
  subtitle: string;
  metric: string;
  detail: string;
  glowColor: string;
}) {
  return (
    <div
      className="glass rounded-2xl p-3.5 border border-cyan-500/15 flex flex-col justify-between"
      style={{ boxShadow: `0 4px 20px -2px ${glowColor}` }}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-400">
            {subtitle}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
        </div>
        <h4 className="mt-1 font-mono text-xs font-black uppercase tracking-wider text-white">
          {title}
        </h4>
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-slate-800/60 pt-2">
        <span className="font-mono text-base font-black text-white">{metric}</span>
        <span className="font-mono text-[9px] text-slate-400">{detail}</span>
      </div>
    </div>
  );
}
