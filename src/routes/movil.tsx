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
  Shield,
  Siren,
  ArrowRight,
  Globe,
  Map as MapIcon,
  Send,
  Camera,
  Compass,
} from "lucide-react";
import { useNasa } from "@/hooks/use-nasa";
import { NasaControls } from "@/components/centinela/NasaControls";
import { OperationsPanel } from "@/components/centinela/OperationsPanel";
import type { Horizon } from "@/lib/fire-operations";
import { TacButton } from "@/components/centinela/Brand";
import { snapshotQuery, powerQuery, gibsQuery } from "@/lib/nasa-queries";
import { MobileNav } from "@/components/centinela/MobileNav";
import { TacticalMap, type Layers as L } from "@/components/centinela/TacticalMap";
import { PlanetaryGlobe } from "@/components/centinela/PlanetaryGlobe";
import { RadarWidget } from "@/components/centinela/RadarWidget";
import { FleetWidget } from "@/components/centinela/FleetWidget";
import { ignitionRisk, riskLabel } from "@/lib/centinela-data";
import { classifyFrp } from "@/lib/fire-indices";

export const Route = createFileRoute("/movil")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Terminal Táctico Orbital Móvil" },
      {
        name: "description",
        content:
          "Terminal móvil de monitoreo de focos de calor satelitales NASA en 3D, recursos hídricos y telemetría para Bolivia.",
      },
      { property: "og:title", content: "CENTINELA · Terminal Táctico Orbital Móvil" },
      {
        property: "og:description",
        content: "Globo 3D orbital, inmersión táctica en Bolivia y despacho de emergencias.",
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
  const nasa = useNasa();
  const [selectedId, setSelectedId] = useState("");
  const [viewMode, setViewMode] = useState<"globe" | "map">("globe");
  const w = nasa.weather;
  const risk = w ? ignitionRisk(w.temp, w.wind, w.rh) : null;
  const { label } = riskLabel(risk ?? 0);
  const [layers, setLayers] = useState<L>({ thermal: true, viirsThermal: true });
  const [horizon, setHorizon] = useState<Horizon | 0>(0);
  const [open, setOpen] = useState(false);

  const selected = nasa.incidents.find((i) => i.id === selectedId) ?? nasa.incidents[0];
  const active = nasa.incidents.length;
  const r = 34;
  const c = 2 * Math.PI * r;

  const ringColor = (risk ?? 0) >= 75 ? "#ff334b" : (risk ?? 0) >= 40 ? "#f59e0b" : "#00e5ff";
  const frpInfo = selected ? classifyFrp(selected.frp) : null;

  const dispatchWhatsApp = () => {
    if (!selected) return;
    const msg = `🚨 *CENTINELA · DESPACHO TÁCTICO MÓVIL*\n\n🔥 *Foco:* ${selected.id}\n📍 *Zona:* ${selected.zone}\n🗺️ *Coordenadas:* ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}\n⚡ *Intensidad (FRP):* ${selected.frp ?? "N/D"} MW (${frpInfo?.category ?? "N/D"})\n🛰️ *Fuente:* ${selected.source}\n🎯 *Confianza:* ${selected.confidence ?? "N/D"}%\n💧 *Agua recomendada:* ~${frpInfo?.recommendedWaterLiters ?? 3000} L\n🚒 *Punto de agua GAMC:* ${selected.hydrant.name} (${selected.hydrant.distKm ?? "N/D"} km)\n\n_Enviado desde Terminal Móvil CENTINELA HUD_`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col pb-24 bg-[#040814] hud-bg text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Top Mobile Futuristic Bar */}
      <header className="sticky top-0 z-50 glass border-b border-cyan-500/25 flex items-center justify-between px-4 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-950/40 shadow-[0_0_15px_rgba(0,229,255,0.35)]">
            <Globe className="h-5 w-5 text-cyan-300 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-mono text-sm font-black tracking-[0.25em] text-white">
              <span>CENTINELA</span>
              <span className="rounded bg-cyan-500/20 px-1 py-0.2 font-mono text-[8px] font-bold text-cyan-300">
                3D
              </span>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-cyan-400">
              {nasa.regionId === "all" ? "Bolivia Orbital" : `Bolivia · ${nasa.regionId}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switcher 3D Globe vs 2D Map */}
          <div className="flex rounded-xl border border-cyan-500/30 bg-slate-950/70 p-0.5">
            <button
              onClick={() => setViewMode("globe")}
              className={`rounded-lg px-2 py-1 font-mono text-[10px] font-bold ${
                viewMode === "globe"
                  ? "bg-cyan-500/30 text-white shadow-[0_0_8px_rgba(0,229,255,0.4)]"
                  : "text-slate-400"
              }`}
            >
              3D
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`rounded-lg px-2 py-1 font-mono text-[10px] font-bold ${
                viewMode === "map"
                  ? "bg-cyan-500/30 text-white shadow-[0_0_8px_rgba(0,229,255,0.4)]"
                  : "text-slate-400"
              }`}
            >
              2D
            </button>
          </div>

          <Link
            to="/dashboard"
            aria-label="Panel de comando desktop"
            className="rounded-xl border border-cyan-500/30 bg-slate-900/60 p-2 text-cyan-300 transition-colors hover:border-cyan-400"
          >
            <LayoutDashboard className="h-4 w-4" />
          </Link>

          {nasa.incidents[0] ? (
            <Link
              to="/alerta/$id"
              params={{ id: nasa.incidents[0].id }}
              aria-label="Alertas"
              className="relative p-2 rounded-xl border border-red-500/30 bg-red-950/30 text-red-300"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white shadow-[0_0_8px_#ff334b]">
                {active}
              </span>
            </Link>
          ) : (
            <span className="p-2 rounded-xl border border-slate-800 text-slate-500">
              <Bell className="h-4 w-4" />
            </span>
          )}
        </div>
      </header>

      {/* Hero 3D Earth Globe / Map Viewport */}
      <div className="relative mx-3 mt-2.5 h-[52vh] min-h-[380px] overflow-hidden rounded-3xl border border-cyan-500/35 glass shadow-[0_0_40px_rgba(0,0,0,0.9)]">
        {viewMode === "globe" ? (
          <PlanetaryGlobe
            incidents={nasa.incidents}
            selectedId={selected?.id}
            onSelect={setSelectedId}
            onEnterTacticalMap={() => setViewMode("map")}
            className="w-full h-full"
          />
        ) : (
          <>
            <TacticalMap
              incidents={nasa.incidents}
              selectedId={selected?.id}
              center={nasa.center}
              zoom={nasa.region?.zoom ?? 11}
              national
              gibsDates={nasa.gibs}
              onPoint={nasa.setPoint}
              layers={layers}
              horizon={horizon}
              weather={w}
              wind={{ deg: w?.windDeg ?? 0, kmh: w?.wind ?? 0 }}
              onSelect={setSelectedId}
            />

            {/* Botón de Capas Flotante */}
            <button
              aria-label="Capas"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="glass absolute left-3 top-3 z-[400] flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)]"
            >
              <Layers className="h-4 w-4" />
            </button>

            {open && (
              <div className="glass absolute left-14 top-3 right-3 z-[400] space-y-1.5 rounded-xl border border-cyan-500/30 p-2.5 text-xs font-mono animate-in fade-in">
                {(["thermal", "viirs", "viirsThermal", "modis"] as (keyof L)[]).map((k) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={Boolean(layers[k])}
                      onChange={() => setLayers({ ...layers, [k]: !layers[k] })}
                      className="rounded border-cyan-500/50 bg-slate-900 text-cyan-400"
                    />
                    <span>
                      {{
                        thermal: "Focos FIRMS / EONET",
                        viirs: "VIIRS True Color",
                        viirsThermal: "VIIRS SNPP Térmica",
                        modis: "MODIS Anomalías",
                      }[k]}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Armonizados Banner */}
      {nasa.snapshot.harmonizationStats && nasa.snapshot.harmonizationStats.dualConfirmedClusters > 0 && (
        <div className="mx-3 mt-2.5 flex items-center justify-between rounded-xl border border-cyan-400/30 bg-cyan-950/40 px-3 py-2 font-mono text-xs text-cyan-200 shadow-[0_0_14px_rgba(0,229,255,0.15)]">
          <span className="flex items-center gap-1.5 font-bold">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            {nasa.snapshot.harmonizationStats.dualConfirmedClusters} Focos Armonizados Dual
          </span>
          <span className="text-[10px] text-cyan-400">
            Confianza: {nasa.snapshot.harmonizationStats.corroborationRatePercent}%
          </span>
        </div>
      )}

      {/* Quick Action: WhatsApp Dispatch & Water Info */}
      {selected && (
        <div className="glass mx-3 mt-2.5 rounded-2xl border border-cyan-500/25 p-3 space-y-2">
          <div className="flex items-center justify-between font-mono">
            <span className="text-xs font-black text-red-400">{selected.id}</span>
            <span className="text-xs font-bold text-cyan-300">{selected.frp ?? "N/D"} MW</span>
          </div>
          <div className="text-[10px] font-mono text-slate-300">
            Zona: <b className="text-white">{selected.zone}</b> · GAMC: {selected.hydrant.name} ({selected.hydrant.distKm ?? "N/D"} km)
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <TacButton
              tone="cyan"
              className="w-full text-xs py-2 shadow-[0_0_15px_rgba(0,229,255,0.3)]"
              onClick={dispatchWhatsApp}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Despachar WA</span>
            </TacButton>
            <Link
              to="/alerta/$id"
              params={{ id: selected.id }}
              className="flex items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900/60 font-mono text-xs font-bold text-slate-200 transition-colors hover:border-cyan-400"
            >
              <span>Detalles</span>
              <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
            </Link>
          </div>
        </div>
      )}

      {/* Circular Radar Scan Widget */}
      <div className="mx-3 mt-2.5">
        <RadarWidget
          incidents={nasa.incidents}
          selectedId={selected?.id}
          onSelect={setSelectedId}
        />
      </div>

      {/* Fleet Satellites Widget */}
      <div className="mx-3 mt-2.5">
        <FleetWidget />
      </div>

      {/* Controles de Simulación NASA */}
      <div className="px-3 mt-2.5">
        <NasaControls nasa={nasa} compact />
      </div>

      {/* Tarjetas de Telemetría Rápida */}
      <div className="grid grid-cols-[auto_1fr] gap-2.5 px-3 mt-2.5">
        {/* Radial Risk Gauge */}
        <div className="glass flex flex-col items-center justify-center rounded-2xl p-3 border border-cyan-500/20">
          <div className="relative h-20 w-20">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(15, 23, 42, 0.8)" strokeWidth="6" />
              {risk !== null && (
                <circle
                  cx="40"
                  cy="40"
                  r={r}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={c * (1 - risk / 100)}
                  style={{ filter: `drop-shadow(0 0 6px ${ringColor})` }}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className="text-lg font-black text-white">{risk === null ? "N/D" : `${risk}%`}</span>
            </div>
          </div>
          <div className="mt-1 font-mono text-[8px] uppercase tracking-widest text-slate-400">RIESGO IGNICIÓN</div>
          <div className="font-mono text-xs font-black uppercase tracking-wider" style={{ color: ringColor }}>
            {risk === null ? "Sin dato" : label}
          </div>
        </div>

        {/* Atmospheric Sensor Telemetry */}
        <div className="glass rounded-2xl p-3 border border-cyan-500/20 flex flex-col justify-between">
          <div className="font-mono text-[9px] uppercase tracking-widest text-cyan-400">
            NASA POWER · {nasa.weatherReal ? nasa.weatherDate : "En vivo"}
          </div>
          <div className="space-y-1 text-xs font-mono mt-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Thermometer className="h-3.5 w-3.5 text-red-400" /> Temp
              </span>
              <b className="font-black text-white">{w ? `${w.temp}°C` : "N/D"}</b>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Wind className="h-3.5 w-3.5 text-cyan-300" /> Viento
              </span>
              <b className="font-black text-cyan-300">{w ? `${w.wind} km/h` : "N/D"}</b>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Droplets className="h-3.5 w-3.5 text-amber-400" /> Humedad
              </span>
              <b className="font-black text-amber-300">{w ? `${w.rh}%` : "N/D"}</b>
            </div>
          </div>
        </div>
      </div>

      {/* Panel de Operaciones */}
      <div className="mx-3 mt-2.5">
        <OperationsPanel
          incidents={nasa.incidents}
          selected={selected}
          weather={w}
          weatherReal={nasa.weatherReal}
          weatherDate={nasa.weatherDate}
          regionId={nasa.regionId}
          horizon={horizon}
          onHorizon={setHorizon}
          snapshotSource={nasa.snapshot.source}
          snapshotUpdated={nasa.snapshot.updated}
        />
      </div>

      <MobileNav />
    </div>
  );
}
