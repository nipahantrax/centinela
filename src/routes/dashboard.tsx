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
  Maximize2,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Brand, TacButton } from "@/components/centinela/Brand";
import { NavMenu, Panel, StatusBadge } from "@/components/centinela/Shell";
import { RiskGauge } from "@/components/centinela/RiskGauge";
import { TacticalMap, type Layers } from "@/components/centinela/TacticalMap";
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
      { title: "CENTINELA · Centro de Mando Táctico Orbital" },
      {
        name: "description",
        content:
          "Plataforma espacial de monitoreo de incendios para Bolivia con telemetría NASA en tiempo real, armonización MODIS+VIIRS y vector de viento.",
      },
      { property: "og:title", content: "CENTINELA · Centro de Mando Táctico Orbital" },
      {
        property: "og:description",
        content: "Detecciones satelitales térmicas de alta resolución para Cochabamba y Parque Nacional Tunari.",
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

function Dashboard() {
  const nasa = useNasa();
  const { weather, incidents, syncing, center } = nasa;
  const lastSync = nasa.weatherDate ?? "En vivo";
  const [nodeId, setNodeId] = useState("tunari");
  const [selectedId, setSelectedId] = useState("");
  const [layers, setLayers] = useState<Layers>({ thermal: true, viirsThermal: true });
  const [horizon, setHorizon] = useState<Horizon | 0>(0);
  const [channelOpen, setChannelOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "harmonized" | "critical" | "near">("all");
  const [currentTime, setCurrentTime] = useState("");

  // Live HUD clock (like 22:30:05 in big data space HUD)
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
    toast.success("Telemetría NASA sincronizada correctamente.");
  };

  const dispatchWhatsApp = () => {
    if (!selected) return;
    const msg = `🚨 *CENTINELA · DESPACHO TÁCTICO DE BRIGADA*\n\n🔥 *Foco:* ${selected.id}\n📍 *Zona:* ${selected.zone}\n🗺️ *Coordenadas:* ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}\n⚡ *Intensidad (FRP):* ${selected.frp ?? 'N/D'} MW (${frpInfo?.category ?? 'N/D'})\n🛰️ *Fuente:* ${selected.source}\n🎯 *Confianza:* ${selected.confidence ?? 'N/D'}%\n💧 *Agua sugerida:* ~${frpInfo?.recommendedWaterLiters ?? 3000} L\n🚒 *Punto de agua:* ${selected.hydrant.name} (${selected.hydrant.distKm ?? 'N/D'} km)\n🛣️ *Acceso:* ${selected.route.state}\n\n_Enviado desde Centro de Mando Táctico Orbital CENTINELA_`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="w-full min-h-screen bg-[#060913] hud-bg text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* =========================================================
          TOP COMMAND BAR (NOVA SPACE EXPLORATION HUD AESTHETIC)
         ========================================================= */}
      <header className="sticky top-0 z-50 glass border-b border-cyan-500/20 px-4 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-4">
          {/* Left: Brand + Status Pill */}
          <div className="flex items-center gap-4">
            <Brand />
            <div className="hidden items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-950/40 px-3 py-1 font-mono text-[11px] text-cyan-300 md:flex">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff] animate-ping" />
              <span>ORBITAL HUD · BOLIVIA</span>
            </div>
          </div>

          {/* Center: Live Digital Telemetry Clock & Node Selector */}
          <div className="hidden items-center gap-4 lg:flex">
            <div className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-slate-950/60 px-3 py-1 font-mono">
              <span className="text-[10px] uppercase tracking-widest text-slate-400">HORA LA PAZ (BOT):</span>
              <span className="text-base font-black text-cyan-300 tracking-wider">
                {currentTime || "22:30:00"}
              </span>
            </div>

            {/* Hierarchy Node Selector */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">ZONA:</span>
              <select
                value={nodeId}
                onChange={(e) => {
                  setNodeId(e.target.value);
                  const n = NODES.find((node) => node.id === e.target.value);
                  if (n) {
                    nasa.setRegion("Cochabamba");
                    nasa.setPoint(n.center);
                  }
                }}
                className="h-8 rounded-lg border border-cyan-500/30 bg-slate-900/80 px-2.5 font-mono text-xs text-cyan-200 outline-none transition-all hover:border-cyan-400 focus:border-cyan-300 focus:ring-1 focus:ring-cyan-300"
              >
                {NODES.map((n) => (
                  <option key={n.id} value={n.id} className="bg-slate-950 text-white">
                    {n.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Quick Telemetry Stats + Siren + Emergency */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-1 font-mono text-xs text-red-300">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse shadow-[0_0_8px_#ff334b]" />
              <span>{filteredIncidents.length} FOCOS ACTIVOS</span>
            </div>

            <TacButton
              tone="danger"
              onClick={() => setChannelOpen(true)}
              className="text-xs px-3 py-1.5 shadow-[0_0_16px_rgba(255,51,75,0.4)]"
            >
              <Siren className="h-3.5 w-3.5 animate-bounce" />
              <span>SOS ALERTA</span>
            </TacButton>
          </div>
        </div>
      </header>

      {/* =========================================================
          MAIN HUD GRID: 3 WIDESCREEN REAL COLUMNS
         ========================================================= */}
      <div className="mx-auto w-full max-w-[1920px] flex-1 p-3 lg:p-4">
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12 lg:items-start">
          {/* =========================================================
              LEFT HUD COLUMN (lg:col-span-3): TELEMETRÍA Y RIESGO
             ========================================================= */}
          <aside className="space-y-3 lg:col-span-3">
            {/* 1. Risk Velocity Circular Gauge */}
            <Panel title="Riesgo de Ignición Atmosférico" className={(risk ?? 0) >= 75 ? "border-red-500/40 shadow-[0_0_24px_rgba(255,51,75,0.25)]" : ""}>
              {risk === null ? (
                <p className="font-mono text-xs text-slate-400">Calculando con sensores NASA POWER...</p>
              ) : (
                <RiskGauge value={risk} />
              )}
            </Panel>

            {/* 2. NASA POWER Atmospheric Telemetry with Big Numbers */}
            <Panel
              title="NASA POWER · Sensor Satelital"
              right={<span className="font-mono text-[9px] text-cyan-400">{lastSync}</span>}
            >
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric
                  icon={Thermometer}
                  label="Temperatura"
                  value={weather ? `${weather.temp}°` : "N/D"}
                  sub="Celsius"
                  colorClass="text-red-400"
                  bgGlow="rgba(255,69,58,0.15)"
                />
                <Metric
                  icon={Wind}
                  label="Viento"
                  value={weather ? `${weather.wind}` : "N/D"}
                  sub={weather ? `km/h ${weather.windDir}` : "km/h"}
                  colorClass="text-cyan-300"
                  bgGlow="rgba(0,229,255,0.15)"
                />
                <Metric
                  icon={Droplets}
                  label="Humedad Rel."
                  value={weather ? `${weather.rh}%` : "N/D"}
                  sub="Sequedad"
                  colorClass={weather && weather.rh < 20 ? "text-red-400" : "text-amber-400"}
                  bgGlow="rgba(245,158,11,0.15)"
                />
              </div>

              <TacButton
                className="mt-3 w-full text-xs"
                onClick={refreshSensors}
                disabled={syncing}
                tone="ghost"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-cyan-300 ${syncing ? "animate-spin" : ""}`} />
                <span>Actualizar Sensores NASA</span>
              </TacButton>
            </Panel>

            {/* 3. Aerodynamic Vector Compass (Wind propagation) */}
            <TacticalCompass
              temp={weather?.temp}
              rh={weather?.rh}
              windKmH={weather?.wind}
              windDeg={weather?.windDeg}
              dateStr={nasa.weatherDate}
            />

            {/* 4. Sci-Fi Navigation Menu */}
            <Panel title="Estaciones y Módulos">
              <NavMenu />
            </Panel>
          </aside>

          {/* =========================================================
              CENTER HERO COLUMN (lg:col-span-6): MAPA TÁCTICO PROTAGONISTA
             ========================================================= */}
          <main className="flex flex-col gap-3 lg:col-span-6">
            {/* Top Controls Bar */}
            <div className="glass space-y-2.5 rounded-2xl p-3">
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

              {/* Layer Selection Sci-Fi Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-400 mr-1">
                  <LayersIcon className="h-3 w-3 text-cyan-400" />
                  Capas:
                </span>
                {LAYER_LABELS.map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setLayers((s) => ({ ...s, [k]: !s[k] }))}
                    className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-all duration-200 ${
                      layers[k]
                        ? "border-cyan-400/60 bg-cyan-500/25 text-white shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                        : "border-slate-800 bg-slate-950/60 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {layers[k] ? "●" : "○"} {l}
                  </button>
                ))}
              </div>
            </div>

            {/* MAPA TÁCTICO PROTAGONISTA (PROMINENT HERO HUD) */}
            <div className="glass relative min-h-[520px] h-[58vh] lg:h-[72vh] w-full overflow-hidden rounded-2xl border border-cyan-500/25 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              {/* Corner HUD reticles */}
              <div className="pointer-events-none absolute top-3 left-3 z-[400] flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-slate-950/80 px-2.5 py-1 font-mono text-[10px] text-cyan-300 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span>COORD: {center[0].toFixed(3)}°, {center[1].toFixed(3)}° · ZOOM {nasa.region?.zoom ?? 11}</span>
              </div>

              <div className="pointer-events-none absolute top-3 right-3 z-[400] hidden sm:flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-slate-950/80 px-2.5 py-1 font-mono text-[10px] text-slate-300 backdrop-blur-md">
                <span className="text-cyan-400 font-bold">TUNARI MANDO TÁCTICO</span>
              </div>

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
            </div>

            {/* Barra de Acciones Rápidas Tácticas Bajo el Mapa */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <TacButton
                tone="cyan"
                className="py-2.5 text-xs shadow-[0_0_18px_rgba(0,229,255,0.3)]"
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
                    toast.info(`Ruta táctica hacia ${selected.id}: ${selected.route.state} (${selected.route.distKm ?? 'N/D'} km)`);
                  } else {
                    toast.info("Selecciona un foco en el mapa para calcular ruta.");
                  }
                }}
              >
                <RouteIcon className="h-3.5 w-3.5 text-cyan-300" />
                <span>Ruta de Acceso GAMC</span>
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
              RIGHT HUD COLUMN (lg:col-span-3): INSPECTOR Y LOGÍSTICA
             ========================================================= */}
          <aside className="space-y-3 lg:col-span-3">
            {/* 1. Feed de Focos Filtrados */}
            <Panel
              title={`Focos Activos (${filteredIncidents.filter((i) => i.status !== "Controlado").length})`}
              right={
                <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-400">
                  {activeFilter}
                </span>
              }
            >
              <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {filteredIncidents.map((i) => {
                  const isSel = i.id === selectedId;
                  return (
                    <li key={i.id}>
                      <button
                        onClick={() => setSelectedId(i.id)}
                        className={`flex w-full items-center justify-between rounded-xl border p-2 text-left transition-all duration-200 ${
                          isSel
                            ? "border-cyan-400/70 bg-cyan-500/20 shadow-[0_0_16px_rgba(0,229,255,0.25)]"
                            : "border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 font-mono text-xs font-bold text-white">
                            {i.source === "MODIS+VIIRS armonizado" && (
                              <Sparkles className="h-3 w-3 text-cyan-300" />
                            )}
                            <span>{i.id}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{i.zone}</div>
                        </div>
                        <div className="text-right">
                          <StatusBadge s={i.status} />
                          {i.frp && (
                            <span className="block mt-1 font-mono text-[9px] text-amber-400 font-bold">
                              {i.frp} MW
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            {/* 2. Inspector Táctico Holográfico */}
            {selected ? (
              <Panel
                title="Inspector Táctico"
                right={<StatusBadge s={selected.status} />}
                className={selected.status === "Activo" ? "border-red-500/40 shadow-[0_0_20px_rgba(255,51,75,0.2)]" : ""}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-cyan-500/10 pb-1.5">
                    <span className="font-mono text-sm font-black text-red-400">
                      {selected.id}
                    </span>
                    {selected.source === "MODIS+VIIRS armonizado" && (
                      <span className="rounded-full border border-cyan-400/40 bg-cyan-500/20 px-2 py-0.2 font-mono text-[9px] font-bold text-cyan-300">
                        ARMONIZADO
                      </span>
                    )}
                  </div>

                  <dl className="grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-xs">
                    <Dt k="Fecha/Hora" v={fmtDate(selected.date)} />
                    <Dt k="Zona" v={selected.zone} />
                    <Dt k="Coordenadas" v={`${selected.lat.toFixed(4)}°, ${selected.lng.toFixed(4)}°`} />
                    <Dt k="Confianza" v={selected.confidence === null ? "N/D" : `${selected.confidence}%`} />
                    <Dt k="FRP Radiativo" v={selected.frp === null ? "N/D" : `${selected.frp} MW`} />
                    <Dt k="Severidad" v={frpInfo ? frpInfo.category : "N/D"} />
                  </dl>

                  {/* Demanda Hídrica y Consejo */}
                  {frpInfo && (
                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-2.5 text-xs font-mono">
                      <div className="flex justify-between text-slate-300">
                        <span className="text-[10px] uppercase">Demanda Hídrica:</span>
                        <span className="font-bold text-cyan-300">~{frpInfo.recommendedWaterLiters} Litros</span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400 leading-tight">
                        {frpInfo.tacticalAdvice}
                      </p>
                    </div>
                  )}

                  {/* Logística Local GAMC */}
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                      <div className="flex-1 font-mono">
                        <div className="text-[9px] uppercase text-slate-400">Punto de agua:</div>
                        <div className="font-bold text-slate-200">
                          {selected.hydrant.distKm === null ? "No verificado" : `${selected.hydrant.distKm} km`} · {selected.hydrant.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <RouteIcon className="h-3.5 w-3.5 text-cyan-400" />
                      <div className="flex-1 font-mono">
                        <div className="text-[9px] uppercase text-slate-400">Ruta de acceso:</div>
                        <div
                          className={`font-bold ${
                            selected.route.state === "Ruta Habilitada"
                              ? "text-emerald-400"
                              : selected.route.state === "Ruta Restringida"
                                ? "text-amber-400"
                                : "text-red-400"
                          }`}
                        >
                          {selected.route.state}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mountain className="h-3.5 w-3.5 text-cyan-400" />
                      <div className="flex-1 font-mono">
                        <div className="text-[9px] uppercase text-slate-400">Altitud terreno:</div>
                        <div className="font-bold text-slate-200">
                          {selected.altitude === null ? "N/D" : `${selected.altitude} m s.n.m.`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botón de Copiar Reporte ICS-209 */}
                  <TacButton
                    tone="primary"
                    className="w-full text-xs"
                    onClick={() => {
                      const text = `CENTINELA ICS-209 · REPORTE TÁCTICO\nFoco: ${selected.id}\nZona: ${selected.zone}\nCoordenadas: ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}\nIntensidad (FRP): ${selected.frp ?? 'N/D'} MW (${frpInfo?.category ?? 'N/D'})\nFuente Satelital: ${selected.source}\nConfianza: ${selected.confidence ?? 'N/D'}%\nAgua recomendada: ~${frpInfo?.recommendedWaterLiters ?? 3000} L\nRecomendación: ${frpInfo?.tacticalAdvice ?? 'Evaluar en terreno'}`;
                      void navigator.clipboard.writeText(text);
                      toast.success("Ficha táctica ICS-209 copiada al portapapeles");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar Ficha ICS-209</span>
                  </TacButton>
                </div>
              </Panel>
            ) : (
              <Panel>
                <p className="font-mono text-xs text-slate-400">
                  Selecciona una anomalía térmica en el mapa para inspeccionar telemetría.
                </p>
              </Panel>
            )}

            {/* 3. Estado de Telemetría NASA */}
            <Panel title="Estado Enlace Satelital" className="max-h-36 overflow-y-auto">
              <ul className="space-y-1 font-mono text-[10px] text-slate-400">
                {nasa.snapshot.messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
                <li className="text-cyan-300 font-bold pt-1">
                  Última sincronización: {fmtDate(nasa.snapshot.updated)} · Fuente: {nasa.snapshot.source}
                </li>
              </ul>
            </Panel>
          </aside>
        </div>

        {/* =========================================================
            BOTTOM MISSION TELEMETRY STRIP (NOVA MISSION CARDS)
           ========================================================= */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MissionCard
            title="ÁREA PROTEGIDA TUNARI"
            subtitle="SERNAP · COCHABAMBA"
            metric="328,000 ha"
            detail="Perímetro de amortiguamiento activo"
            glowColor="rgba(16,185,129,0.3)"
          />
          <MissionCard
            title="DUAL CONFIRMATION RATE"
            subtitle="MODIS 1km + VIIRS 375m"
            metric={`${nasa.snapshot.harmonizationStats?.corroborationRatePercent ?? 88}%`}
            detail="Validación cruzada espacio-temporal"
            glowColor="rgba(0,229,255,0.3)"
          />
          <MissionCard
            title="RECURSOS HÍDRICOS GAMC"
            subtitle="SEMAPA · COCHABAMBA"
            metric="7 Fuentes"
            detail="Represas, tanques e hidrantes geolocalizados"
            glowColor="rgba(56,189,248,0.3)"
          />
          <MissionCard
            title="LÍNEA DE RESPUESTA"
            subtitle="CENTRAL DE EMERGENCIAS"
            metric="119 / 110"
            detail="Bomberos GAMC y Policía Boliviana"
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

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  colorClass,
  bgGlow,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
  sub?: string;
  colorClass: string;
  bgGlow: string;
}) {
  return (
    <div
      className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5 transition-all duration-200"
      style={{ boxShadow: `0 0 16px -4px ${bgGlow}` }}
    >
      <Icon className={`mx-auto h-4 w-4 ${colorClass}`} />
      <div className={`mt-1 font-mono text-xl font-black ${colorClass}`}>
        {value}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
        {sub ?? label}
      </div>
    </div>
  );
}

function Dt({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-wider text-slate-500">{k}</dt>
      <dd className="break-words font-bold text-slate-200">{v}</dd>
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
        <span className="font-mono text-lg font-black text-white">{metric}</span>
        <span className="font-mono text-[9px] text-slate-400">{detail}</span>
      </div>
    </div>
  );
}
