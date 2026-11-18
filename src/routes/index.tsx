import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Globe, Clock } from "lucide-react";
import { PlanetaryGlobe } from "@/components/centinela/PlanetaryGlobe";
import { INCIDENTS } from "@/lib/centinela-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Centro Orbital Planetario" },
      {
        name: "description",
        content:
          "Plataforma planetaria 3D de vigilancia y alerta temprana de incendios forestales con satélites NASA en tiempo real para Bolivia.",
      },
      { property: "og:title", content: "CENTINELA · Centro Orbital Planetario" },
      {
        property: "og:description",
        content: "Globo 3D planetario hiperrealista y telemetría orbital NASA.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const nav = useNavigate();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(INCIDENTS[0]?.id ?? "");
  const [currentTime, setCurrentTime] = useState("");

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
      {/* =========================================================
          CYBER HUD BORDER FRAME (MATCHING REFERENCE IMAGE)
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
          MINIMAL HUD HEADER (TITLE + TIME ONLY)
         ========================================================= */}
      <header className="absolute top-4 left-6 right-6 z-50 flex items-center justify-between pointer-events-none">
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

        {/* Right: Digital Telemetry Clock */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-950/70 px-3.5 py-1.5 font-mono backdrop-blur-xl shadow-[0_0_15px_rgba(0,229,255,0.15)]">
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-sm font-black tracking-widest text-cyan-300">
            {currentTime || "22:30:05"}
          </span>
        </div>
      </header>

      {/* =========================================================
          ONLY THE WORLD: 100% FULLSCREEN 3D EARTH PLANET
         ========================================================= */}
      <main className="relative h-full w-full">
        <PlanetaryGlobe
          incidents={INCIDENTS}
          selectedId={selectedIncidentId}
          onSelect={setSelectedIncidentId}
          onEnterTacticalMap={() => nav({ to: "/dashboard" })}
          className="h-full w-full"
        />
      </main>
    </div>
  );
}
