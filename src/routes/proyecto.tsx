import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Palette, Satellite, Zap, Shield, Sparkles, Orbit } from "lucide-react";
import { Panel } from "@/components/centinela/Shell";

export const Route = createFileRoute("/proyecto")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Dossier de Misión Orbital" },
      {
        name: "description",
        content:
          "Plan estratégico y arquitectura de CENTINELA para NASA Space Apps Cochabamba 2026: armonización de focos MODIS y VIIRS con recursos del GAMC.",
      },
      { property: "og:title", content: "CENTINELA · Dossier de Misión Orbital" },
      {
        property: "og:description",
        content: "Pilares, arquitectura espacial y hoja de ruta del proyecto CENTINELA.",
      },
    ],
  }),
  component: Proyecto,
});

const pillars = [
  {
    i: Satellite,
    t: "Inteligencia Satelital (NASA)",
    d: "Integración con FIRMS, POWER y GIBS para detectar anomalías térmicas en tiempo real, variables aerodinámicas de propagación y ortoimágenes de alta resolución.",
  },
  {
    i: Building2,
    t: "Acción Local (GAMC)",
    d: "Mapeo georreferenciado de fuentes hídricas (represas, tanques SEMAPA, hidrantes) y rutas de acceso táctico hacia el Parque Nacional Tunari.",
  },
  {
    i: Zap,
    t: "Arquitectura Reactiva",
    d: "Mando táctico ultra-rápido en Vite + TanStack Start con renderizado de vectores en milisegundos y cálculo de riesgo FWI.",
  },
  {
    i: Palette,
    t: "Diseño Orbital HUD",
    d: "Estética Sci-Fi Space Exploration HUD inspirada en centros de control aeroespacial con contrastes cian, esmeralda y alerta térmica.",
  },
];

const apis = [
  [
    "NASA FIRMS",
    "Coordenadas, brillo radiativo (FRP en MW) y confianza térmica de los sensores MODIS y VIIRS. Fuente de verdad para el algoritmo de alerta.",
  ],
  [
    "NASA POWER",
    "Velocidad, dirección del viento y humedad relativa geolocalizadas para proyectar vectores de avance y riesgo de ignición 30-30-30.",
  ],
  [
    "NASA GIBS",
    "Capas base satelitales de reflectancia real (True Color) y anomalías térmicas para verificación visual de columnas de humo.",
  ],
];

const plan = [
  ["Fase 01 · 08:00", "Apertura y Datos", "Conexión a APIs NASA, ingestión GeoJSON del municipio y Parque Tunari."],
  ["Fase 02 · 10:00", "Motor de Armonización", "Algoritmo de clustering espacial euclidiano (1.5 km) y temporal (12 h) MODIS + VIIRS."],
  ["Fase 03 · 14:00", "Centro de Mando HUD", "Interfaz Sci-Fi con mapa Leaflet táctico, rosa de viento y tac-grid."],
  ["Fase 04 · 19:00", "Integración Logística", "Rutas de acceso, hidrantes GAMC y copiado de fichas ICS-209 para brigadas."],
  ["Fase 05 · 09:00", "Optimización y QA", "Widescreen real, anti-colisión de controles y pruebas de rendimiento."],
  ["Fase 06 · 12:00", "Despliegue y Pitch", "Publicación en producción y simulación interactiva para el jurado."],
];

function Proyecto() {
  return (
    <div className="w-full min-h-screen bg-[#060913] hud-bg text-slate-100 font-sans selection:bg-cyan-500/30 py-8 px-4">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Holographic Header */}
        <header className="glass rounded-3xl p-6 border border-cyan-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-950/40 shadow-[0_0_24px_rgba(0,229,255,0.35)]">
              <Shield className="h-8 w-8 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-400">
                NASA Space Apps Challenge · Cochabamba 2026
              </p>
              <h1 className="font-mono text-3xl font-black tracking-wider text-white">
                MISIÓN CENTINELA
              </h1>
              <p className="text-sm text-slate-400">
                Desafío: <b className="text-cyan-300">Harmonization of MODIS and VIIRS Hot Spots</b> · Parque Tunari GAMC
              </p>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:bg-cyan-500/30 active:scale-[0.98]"
          >
            <span>Centro de Mando</span>
            <ArrowRight className="h-4 w-4 text-cyan-300" />
          </Link>
        </header>

        {/* Objetivo de la Misión */}
        <Panel title="Objetivo Estratégico">
          <p className="text-slate-200 leading-relaxed text-sm">
            Plataforma interactiva de alerta temprana y despacho táctico de incendios para el{' '}
            <b className="text-cyan-300">Parque Nacional Tunari</b>, fusionando anomalías térmicas satelitales NASA con
            recursos hídricos y logísticos municipales.{' '}
            <span className="text-slate-400">
              Los datos satelitales por sí solos informan; cruzados con la infraestructura en tierra del GAMC, salvan vidas y
              bosques.
            </span>
          </p>
        </Panel>

        {/* Cuatro Pilares Arquitectónicos */}
        <div className="grid gap-3.5 sm:grid-cols-2">
          {pillars.map((p, n) => (
            <Panel key={p.t} className="border-cyan-500/15">
              <div className="flex gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-cyan-300">
                  <p.i className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
                    Pilar 0{n + 1}
                  </div>
                  <h3 className="font-mono text-sm font-bold text-white">{p.t}</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{p.d}</p>
                </div>
              </div>
            </Panel>
          ))}
        </div>

        {/* Flujo de Datos Espacial */}
        <Panel title="Arquitectura y Flujo de Telemetría">
          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs">
            {["APIs NASA + Datos GAMC", "Motor Armonización MODIS/VIIRS", "Cálculo FWI + Viento", "Dashboard Táctico HUD"].map(
              (s, i, a) => (
                <span key={s} className="flex items-center gap-2">
                  <span className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3 py-2 text-cyan-200">
                    {s}
                  </span>
                  {i < a.length - 1 && <ArrowRight className="h-4 w-4 text-slate-500" />}
                </span>
              )
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {apis.map(([t, d]) => (
              <div key={t} className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 font-mono">
                <div className="text-xs font-bold text-cyan-300">{t}</div>
                <p className="mt-1 text-xs text-slate-400 leading-normal">{d}</p>
              </div>
            ))}
          </div>
        </Panel>

        {/* Motor de Armonización */}
        <Panel title="El Corazón del Desafío: Motor de Armonización MODIS + VIIRS">
          <div className="space-y-3 text-sm">
            <p className="text-slate-300">
              El reto oficial de la NASA consiste en resolver la disparidad espacial y temporal entre MODIS (1km) y VIIRS
              (375m). En <b>CENTINELA</b> implementamos un motor de correspondencia determinístico:
            </p>
            <div className="grid gap-3 sm:grid-cols-3 font-mono text-xs">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
                <span className="font-bold text-amber-400">1. MODIS (Terra/Aqua)</span>
                <p className="mt-1 text-[11px] text-slate-400">
                  Resolución 1000m. Robusta serie histórica de más de 20 años. Excelente calibración radiométrica global.
                </p>
              </div>
              <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-3">
                <span className="font-bold text-orange-400">2. VIIRS (SNPP / NOAA-20)</span>
                <p className="mt-1 text-[11px] text-slate-400">
                  Resolución 375m en banda I. Máxima sensibilidad a conatos tempranos y delineación nítida del frente de fuego.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-400/40 bg-cyan-950/40 p-3 shadow-[0_0_16px_rgba(0,229,255,0.2)]">
                <span className="font-bold text-cyan-300">3. Foco Armonizado</span>
                <p className="mt-1 text-[11px] text-slate-400">
                  Intersección espacial &le; 1.5 km y temporal &le; 12 h. Centroide refinado a 375m con certeza superior al 95%.
                </p>
              </div>
            </div>
          </div>
        </Panel>

        {/* Hoja de Ruta */}
        <Panel title="Hoja de Ruta de Desarrollo">
          <ol className="space-y-2.5">
            {plan.map(([d, f, t]) => (
              <li
                key={d}
                className="grid grid-cols-[120px_1fr] gap-3 border-l-2 border-cyan-400/40 pl-3.5 text-xs sm:grid-cols-[140px_180px_1fr] items-center"
              >
                <span className="font-mono text-cyan-400 font-bold">{d}</span>
                <b className="text-white font-mono">{f}</b>
                <span className="col-span-2 text-slate-400 sm:col-span-1">{t}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <footer className="text-center font-mono text-xs text-slate-500 pt-4">
          NASA Space Apps Challenge · Operación CENTINELA · Cochabamba, Bolivia
        </footer>
      </div>
    </div>
  );
}
