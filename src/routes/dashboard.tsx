import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Globe, Map as MapIcon, Clock, Shield } from "lucide-react";
import { PlanetaryGlobe } from "@/components/centinela/PlanetaryGlobe";
import { TacticalMap, type Layers } from "@/components/centinela/TacticalMap";
import { useNasa } from "@/hooks/use-nasa";
import { snapshotQuery, powerQuery, gibsQuery } from "@/lib/nasa-queries";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Centro Orbital Planetario" },
      {
        name: "description",
        content:
          "Plataforma planetaria 3D de monitoreo de incendios forestales con satélites NASA en tiempo real.",
      },
      { property: "og:title", content: "CENTINELA · Centro Orbital Planetario" },
      {
        property: "og:description",
        content: "Globo 3D planetario hiperrealista y telemetría orbital NASA.",
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

function Dashboard() {
  const nasa = useNasa();
  const { weather, incidents, center } = nasa;
  const [selectedId, setSelectedId] = useState("");
  const [viewMode, setViewMode] = useState<"globe" | "map">("globe");
  const [layers] = useState<Layers>({ thermal: true, viirsThermal: true });
  const [currentTime, setCurrentTime] = useState("");

  // Digital HUD Clock (like 22:30:05 in reference image)
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

  const selected = incidents.find((i) => i.id === selectedId) ?? incidents[0];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#02040a] text-slate-100 font-sans select-none">
      {/* =========================================================
          FUTURISTIC CYBER HUD BORDER FRAME (LIKE REFERENCE IMAGE)
         ========================================================= */}
      <div className="pointer-events-none absolute inset-2 z-40 rounded-2xl border border-cyan-500/25 sm:inset-3 sm:rounded-3xl">
        {/* Corner Cyber Brackets */}
        <div className="absolute -top-1 -left-1 h-5 w-5 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute -top-1 -right-1 h-5 w-5 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-2 border-r-2 border-cyan-400" />

        {/* Subtle Horizontal Tech Lines */}
        <div className="absolute top-0 left-1/4 h-px w-1/2 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="absolute bottom-0 left-1/3 h-px w-1/3 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      </div>

      {/* =========================================================
          MINIMAL HUD HEADER (MATCHING CHINESE BIG DATA DASHBOARD)
         ========================================================= */}
      <header className="absolute top-4 left-6 right-6 z-50 flex items-center justify-between pointer-events-none">
        {/* Left: Cyber Title */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-950/40 backdrop-blur-xl shadow-[0_0_15px_rgba(0,229,255,0.35)]">
            <Globe className="h-5 w-5 text-cyan-300 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base sm:text-lg font-black tracking-[0.25em] text-white drop-shadow-[0_0_12px_rgba(0,229,255,0.5)]">
                CENTINELA
              </span>
              <span className="rounded-full border border-cyan-400/50 bg-cyan-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                NASA BIG DATA
              </span>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-400/75">
              ORBITAL WILDFIRE HUD · BOLIVIA
            </div>
          </div>
        </div>

        {/* Center: Minimal View Switcher (3D Globo vs 2D Mapa) */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-1 rounded-xl border border-cyan-500/30 bg-slate-950/70 p-1 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.8)]">
          <button
            onClick={() => setViewMode("globe")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
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
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
              viewMode === "map"
                ? "bg-cyan-500/30 text-white shadow-[0_0_10px_rgba(0,229,255,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MapIcon className="h-3.5 w-3.5 text-cyan-300" />
            <span>Mapa 2D</span>
          </button>
        </div>

        {/* Right: Digital Telemetry Clock */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-950/70 px-3.5 py-1.5 font-mono backdrop-blur-xl shadow-[0_0_15px_rgba(0,229,255,0.15)]">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-sm font-black tracking-widest text-cyan-300">
            {currentTime || "22:30:05"}
          </span>
        </div>
      </header>

      {/* =========================================================
          FULL-SCREEN 3D EARTH PLANETARY WORLD / 2D MAP
         ========================================================= */}
      <main className="relative h-full w-full">
        {viewMode === "globe" ? (
          <PlanetaryGlobe
            incidents={incidents}
            selectedId={selected?.id}
            onSelect={setSelectedId}
            onEnterTacticalMap={() => setViewMode("map")}
            className="h-full w-full"
          />
        ) : (
          <div className="relative h-full w-full">
            <TacticalMap
              incidents={incidents}
              selectedId={selected?.id}
              onSelect={setSelectedId}
              center={center}
              zoom={nasa.region?.zoom ?? 11}
              national
              gibsDates={nasa.gibs}
              onPoint={nasa.setPoint}
              layers={layers}
              horizon={0}
              weather={weather}
              wind={{ deg: weather?.windDeg ?? 0, kmh: weather?.wind ?? 0 }}
            />
            {/* Floating button to return to 3D Globe */}
            <button
              onClick={() => setViewMode("globe")}
              className="absolute top-20 right-6 z-[400] flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-slate-950/80 px-4 py-2 font-mono text-xs font-bold text-cyan-300 backdrop-blur-xl shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all hover:bg-cyan-500/30"
            >
              <Globe className="h-4 w-4" />
              <span>Volver a Globo 3D</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
