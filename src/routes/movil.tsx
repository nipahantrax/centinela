import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Globe, Map as MapIcon, Clock } from "lucide-react";
import { useNasa } from "@/hooks/use-nasa";
import { snapshotQuery, powerQuery, gibsQuery } from "@/lib/nasa-queries";
import { TacticalMap, type Layers as L } from "@/components/centinela/TacticalMap";
import { PlanetaryGlobe } from "@/components/centinela/PlanetaryGlobe";

export const Route = createFileRoute("/movil")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Terminal Orbital Móvil" },
      {
        name: "description",
        content:
          "Terminal móvil con globo 3D hiperrealista de la NASA en tiempo real para Bolivia.",
      },
      { property: "og:title", content: "CENTINELA · Terminal Orbital Móvil" },
      {
        property: "og:description",
        content: "Globo 3D planetario hiperrealista y focos térmicos satelitales.",
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
  const [layers] = useState<L>({ thermal: true, viirsThermal: true });
  const [currentTime, setCurrentTime] = useState("");

  const selected = nasa.incidents.find((i) => i.id === selectedId) ?? nasa.incidents[0];

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

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#02040a] text-slate-100 font-sans select-none">
      {/* Cyber HUD Border Frame */}
      <div className="pointer-events-none absolute inset-2 z-40 rounded-2xl border border-cyan-500/25">
        <div className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-cyan-400" />
      </div>

      {/* Top Minimal Header */}
      <header className="absolute top-3 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-950/40 backdrop-blur-xl shadow-[0_0_12px_rgba(0,229,255,0.35)]">
            <Globe className="h-4 w-4 text-cyan-300 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-mono text-sm font-black tracking-widest text-white">
              <span>CENTINELA</span>
              <span className="rounded bg-cyan-500/20 px-1 py-0.5 text-[8px] font-bold text-cyan-300">
                3D
              </span>
            </div>
          </div>
        </div>

        {/* Center: Switcher 3D vs 2D */}
        <div className="pointer-events-auto flex rounded-xl border border-cyan-500/30 bg-slate-950/70 p-0.5 backdrop-blur-xl">
          <button
            onClick={() => setViewMode("globe")}
            className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold ${
              viewMode === "globe"
                ? "bg-cyan-500/30 text-white shadow-[0_0_8px_rgba(0,229,255,0.4)]"
                : "text-slate-400"
            }`}
          >
            3D
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold ${
              viewMode === "map"
                ? "bg-cyan-500/30 text-white shadow-[0_0_8px_rgba(0,229,255,0.4)]"
                : "text-slate-400"
            }`}
          >
            2D
          </button>
        </div>

        {/* Right: Clock */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-slate-950/70 px-2.5 py-1 font-mono text-xs text-cyan-300 backdrop-blur-xl">
          <Clock className="h-3 w-3 text-cyan-400" />
          <span>{currentTime || "22:30:05"}</span>
        </div>
      </header>

      {/* Main Fullscreen 3D World / 2D Map */}
      <main className="relative h-full w-full">
        {viewMode === "globe" ? (
          <PlanetaryGlobe
            incidents={nasa.incidents}
            selectedId={selected?.id}
            onSelect={setSelectedId}
            onEnterTacticalMap={() => setViewMode("map")}
            className="h-full w-full"
          />
        ) : (
          <div className="relative h-full w-full">
            <TacticalMap
              incidents={nasa.incidents}
              selectedId={selected?.id}
              center={nasa.center}
              zoom={nasa.region?.zoom ?? 11}
              national
              gibsDates={nasa.gibs}
              onPoint={nasa.setPoint}
              layers={layers}
              horizon={0}
              weather={nasa.weather}
              wind={{ deg: nasa.weather?.windDeg ?? 0, kmh: nasa.weather?.wind ?? 0 }}
              onSelect={setSelectedId}
            />
            <button
              onClick={() => setViewMode("globe")}
              className="absolute top-16 right-4 z-[400] flex items-center gap-1.5 rounded-xl border border-cyan-400/50 bg-slate-950/80 px-3 py-1.5 font-mono text-xs font-bold text-cyan-300 backdrop-blur-xl"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Volver a 3D</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
