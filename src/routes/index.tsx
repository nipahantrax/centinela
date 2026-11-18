import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Globe,
  Map,
  Users,
  Shield,
  Orbit,
  ArrowRight,
  LogIn,
  Satellite,
  Compass,
  Radio,
  Flame,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TacButton } from "@/components/centinela/Brand";
import { PlanetaryGlobe } from "@/components/centinela/PlanetaryGlobe";
import { RadarWidget } from "@/components/centinela/RadarWidget";
import { FleetWidget } from "@/components/centinela/FleetWidget";
import { ShareQRModal } from "@/components/centinela/ShareQRModal";
import { INCIDENTS } from "@/lib/centinela-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Centro Orbital de Monitoreo Planetario · Bolivia" },
      {
        name: "description",
        content:
          "Plataforma planetaria 3D de vigilancia y alerta temprana de incendios forestales con satélites NASA en tiempo real para Bolivia.",
      },
      { property: "og:title", content: "CENTINELA · Centro Orbital de Monitoreo Planetario" },
      {
        property: "og:description",
        content: "Globo 3D planetario, constelaciones satelitales NASA y despacho de brigadas.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const nav = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(INCIDENTS[0]?.id ?? "");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        // Logged in users can continue or jump to preferred route
      }
    });
    return () => data.subscription.unsubscribe();
  }, [nav]);

  async function login(provider: "google") {
    setBusy(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) toast.error("No se pudo iniciar sesión. Intenta nuevamente.");
    } catch {
      toast.error("No se pudo conectar. Revisa tu conexión e intenta nuevamente.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-[#030712] hud-bg text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* =========================================================
          TOP CYBER HUD NAVIGATION (NOVA STYLE)
         ========================================================= */}
      <header className="sticky top-0 z-50 glass border-b border-cyan-500/25 px-4 py-3 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/50 bg-cyan-950/40 shadow-[0_0_20px_rgba(0,229,255,0.4)]">
              <Globe className="h-6 w-6 text-cyan-300 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-black tracking-[0.25em] text-white">
                  CENTINELA · NOVA
                </span>
                <span className="rounded-full border border-cyan-400/50 bg-cyan-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                  NASA 3D
                </span>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-400/80">
                SISTEMA ORBITAL DE DEFENSA FORESTAL · BOLIVIA
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 rounded-2xl border border-cyan-500/30 bg-slate-950/70 p-1 backdrop-blur-xl">
            <Link
              to="/dashboard"
              className="rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 transition-all hover:bg-cyan-500/20 hover:text-white"
            >
              Centro Orbital
            </Link>
            <Link
              to="/movil"
              className="rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-300 transition-all hover:bg-cyan-500/20 hover:text-white"
            >
              Terminal Móvil
            </Link>
            <Link
              to="/publico"
              className="rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-300 transition-all hover:bg-cyan-500/20 hover:text-white"
            >
              Acceso Ciudadano
            </Link>
            <Link
              to="/reportes"
              className="rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-300 transition-all hover:bg-cyan-500/20 hover:text-white"
            >
              Reportes
            </Link>
            <Link
              to="/proyecto"
              className="rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-300 transition-all hover:bg-cyan-500/20 hover:text-white"
            >
              Proyecto
            </Link>
          </nav>

          {/* Right: QR Jury Button & Action */}
          <div className="flex items-center gap-2.5">
            <ShareQRModal
              triggerClassName="rounded-xl border-cyan-400/50 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 py-2 px-3 text-xs shadow-[0_0_15px_rgba(0,229,255,0.25)]"
              buttonLabel="📱 QR Móvil / Jurado"
              defaultPath="/movil"
            />
            <Link
              to="/dashboard"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-cyan-400/60 bg-cyan-500/25 px-4 py-2 font-mono text-xs font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all hover:bg-cyan-500/35"
            >
              <span>Abrir Mando</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================
          HERO ORBITAL SECTION WITH 3D PLANET EARTH
         ========================================================= */}
      <section className="relative w-full flex-1 flex flex-col justify-between p-4 lg:p-6 min-h-[calc(100vh-76px)]">
        {/* Floating 3D Earth Globe Canvas (Full Viewport) */}
        <div className="absolute inset-0 z-0">
          <PlanetaryGlobe
            incidents={INCIDENTS}
            selectedId={selectedIncidentId}
            onSelect={setSelectedIncidentId}
            onEnterTacticalMap={() => nav({ to: "/dashboard" })}
            className="w-full h-full"
          />
        </div>

        {/* Foreground Content: Hero Typography (Left Column) */}
        <div className="pointer-events-none relative z-10 mx-auto w-full max-w-[1920px] flex-1 flex flex-col justify-between">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-4 lg:pt-8">
            {/* Left Hero Card */}
            <div className="lg:col-span-5 space-y-5">
              {/* Status pill */}
              <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-slate-950/80 px-4 py-1.5 font-mono text-xs font-bold text-cyan-300 backdrop-blur-xl shadow-[0_0_20px_rgba(0,229,255,0.25)]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>SISTEMA ORBITAL // COCHABAMBA · BOLIVIA</span>
              </div>

              {/* Dramatic Title (Fantik Space Style) */}
              <div className="space-y-1">
                <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                  EXPLORE.
                  <br />
                  <span className="text-cyan-400">DISCOVER.</span>
                  <br />
                  DEFEND.
                </h1>
                <p className="font-sans text-sm sm:text-base text-slate-300 max-w-lg leading-relaxed drop-shadow-[0_2px_15px_rgba(0,0,0,0.9)] pt-2">
                  Vigilancia multiespectral en tiempo real de incendios forestales para Bolivia. Fusión de constelaciones NASA (MODIS & VIIRS), análisis hidrológico PostGIS y despacho táctico ICS-209 para brigadistas.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pointer-events-auto flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 rounded-2xl border border-cyan-400/70 bg-cyan-500/30 px-6 py-3.5 font-mono text-sm font-black uppercase tracking-wider text-white shadow-[0_0_30px_rgba(0,229,255,0.45)] transition-all hover:bg-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Map className="h-4 w-4 text-cyan-300" />
                  <span>Iniciar Inmersión Táctica</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/movil"
                  className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/80 px-5 py-3.5 font-mono text-sm font-bold uppercase tracking-wider text-slate-200 backdrop-blur-xl transition-all hover:border-cyan-400/50 hover:text-white"
                >
                  <Orbit className="h-4 w-4 text-cyan-400" />
                  <span>Terminal Móvil</span>
                </Link>
              </div>

              {/* Quick Login pill */}
              <div className="pointer-events-auto flex items-center gap-2 pt-2">
                <button
                  disabled={busy !== null}
                  onClick={() => void login("google")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-1.5 font-mono text-xs text-slate-400 hover:text-white hover:border-cyan-500/30 transition-all"
                >
                  <LogIn className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{busy === "google" ? "Conectando…" : "Ingreso con Google (Opcional)"}</span>
                </button>
              </div>
            </div>

            {/* Spacer */}
            <div className="hidden lg:block lg:col-span-5" />

            {/* Right Telemetry Column (from Fantik Nova Concept) */}
            <div className="pointer-events-auto hidden lg:flex lg:col-span-2 flex-col items-end space-y-4">
              <div className="glass rounded-2xl border border-cyan-500/25 p-4 text-right space-y-4 shadow-[0_0_25px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                <div>
                  <div className="font-mono text-3xl font-black text-red-400 drop-shadow-[0_0_10px_#ff334b]">
                    09
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
                    Focos en Bolivia
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <div className="font-mono text-3xl font-black text-cyan-300 drop-shadow-[0_0_10px_#00e5ff]">
                    11
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
                    Municipios GAMC
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <div className="font-mono text-2xl font-black text-emerald-400">
                    328K
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
                    Hectáreas Mapeadas
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <div className="font-mono text-sm font-bold text-amber-400">
                    4 SATÉLITES
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
                    Enlace L-Band Activo
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom HUD Cards Deck (Fleet Status & Radar Scan) */}
          <div className="pointer-events-auto mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* System Scan Circular Radar */}
            <RadarWidget
              incidents={INCIDENTS}
              selectedId={selectedIncidentId}
              onSelect={setSelectedIncidentId}
            />

            {/* Fleet Status Card */}
            <FleetWidget />

            {/* Next Mission / Target Card */}
            <div className="glass rounded-2xl border border-cyan-500/25 p-3.5 shadow-[0_0_25px_rgba(0,0,0,0.7)] flex flex-col justify-between font-mono">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-400 animate-pulse" />
                  <span className="text-xs font-black tracking-widest text-red-300 uppercase">
                    OBJETIVO PRIORITARIO · TUNARI
                  </span>
                </div>
                <span className="rounded-md border border-red-500/40 bg-red-950/60 px-2 py-0.5 text-[9px] font-bold text-red-300">
                  ALERTA MÁXIMA
                </span>
              </div>

              <div className="my-2 space-y-1.5 text-xs">
                <div className="text-white font-bold">
                  Parque Nacional Tunari (Cota 2750m - 3200m)
                </div>
                <div className="text-[11px] text-slate-300">
                  Vegetación: Pajonal andino (90%) + Queñua protegida (Polylepis).
                </div>
                <div className="text-[10px] text-cyan-300">
                  Recurso hídrico: Tanque GAMC Wara Wara (1.2 km de distancia).
                </div>
              </div>

              <div className="border-t border-cyan-500/20 pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[10px]">Despacho ICS-209 listo</span>
                <Link
                  to="/dashboard"
                  className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-2.5 py-1 text-[10px] font-bold text-cyan-200 transition-colors hover:bg-cyan-500/35"
                >
                  INTERVENIR AHORA ↗
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
