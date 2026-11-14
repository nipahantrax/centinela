import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Palette, Satellite, Zap } from "lucide-react";
import shield from "@/assets/shield.png";
import { Panel } from "@/components/centinela/Shell";

export const Route = createFileRoute("/proyecto")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Operación y Estrategia" },
      { name: "description", content: "Plan estratégico de CENTINELA para NASA Space Apps Cochabamba 2026: armonización de focos MODIS y VIIRS con recursos del GAMC." },
      { property: "og:title", content: "CENTINELA · Operación y Estrategia" },
      { property: "og:description", content: "Pilares, arquitectura y hoja de ruta del proyecto CENTINELA." },
    ],
  }),
  component: Proyecto,
});

const pillars = [
  { i: Satellite, t: "Inteligencia Satelital (NASA)", d: "Integración con FIRMS, POWER y GIBS para detectar focos de calor, variables de viento e imágenes satelitales base." },
  { i: Building2, t: "Acción Local (GAMC)", d: "Mapeo de zonas urbanas en riesgo, rutas de acceso para bomberos y fuentes de abastecimiento de agua en Cochabamba." },
  { i: Zap, t: "Desarrollo Ultra-Rápido", d: "Vibe Coding con Lovable para tener un prototipo funcional en la primera jornada del hackathon." },
  { i: Palette, t: "Diseño de Alto Impacto", d: "Dark Mode con mapas topográficos oscuros y datos en neón rojo y naranja para transmitir urgencia." },
];
const apis = [
  ["NASA FIRMS", "Coordenadas, brillo térmico y confianza de focos MODIS y VIIRS. Fuente de la verdad para la alerta roja."],
  ["NASA POWER", "Velocidad y dirección del viento geolocalizadas para dibujar polígonos de riesgo de propagación."],
  ["NASA GIBS", "Capas base satelitales de anomalías térmicas y reflectancia para el mapa de Cochabamba."],
];
const plan = [
  ["Sáb 14 · 08:00", "Apertura y Datos", "Claves API NASA y GeoJSON del municipio"],
  ["Sáb 14 · 10:00", "Backend", "Scripts para unificar MODIS/VIIRS y tablas de datos"],
  ["Sáb 14 · 14:00", "Frontend", "Panel, mapa interactivo y widgets"],
  ["Sáb 14 · 19:00", "Integración", "Conectar datos con la interfaz"],
  ["Dom 15 · 09:00", "Testing y Pulido", "Dark Mode y simulación de alerta activa"],
  ["Dom 15 · 12:00", "Pitch y Narrativa", "Casos de uso reales en Cochabamba"],
];

function Proyecto() {
  return (
    <div className="tac-grid min-h-screen">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <header className="flex flex-wrap items-center gap-4">
          <img src={shield} alt="" width={816} height={816} className="h-20 w-20" />
          <div className="flex-1">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-fire">NASA Space Apps Challenge · Cochabamba 2026</p>
            <h1 className="font-mono text-3xl font-bold tracking-wider">Operación CENTINELA</h1>
            <p className="text-muted-foreground">Desafío oficial: <b className="text-primary">Harmonization of MODIS and VIIRS Hot Spots</b> · Enfoque local GAMC</p>
          </div>
          <Link to="/dashboard" className="flex items-center gap-2 rounded-md border border-primary/60 bg-primary/15 px-4 py-2 font-mono text-xs uppercase text-primary glow-primary">Centro de mando <ArrowRight className="h-4 w-4" /></Link>
        </header>
        <Panel title="Objetivo">
          <p>Plataforma interactiva de alerta temprana de incendios para el Parque Nacional Tunari, cruzando anomalías térmicas satelitales con recursos municipales. <span className="text-muted-foreground">Los datos satelitales por sí solos informan; cruzados con los del municipio, operan.</span></p>
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          {pillars.map((p, n) => (
            <Panel key={p.t}><div className="flex gap-3"><p.i className="h-6 w-6 shrink-0 text-primary" /><div><div className="font-mono text-xs text-muted-foreground">0{n + 1}</div><h3 className="font-bold">{p.t}</h3><p className="text-sm text-muted-foreground">{p.d}</p></div></div></Panel>
          ))}
        </div>
        <Panel title="Arquitectura y flujo de datos">
          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs">
            {["APIs NASA + Datos GAMC", "Armonización MODIS/VIIRS", "Base de datos", "Dashboard CENTINELA"].map((s, i, a) => (
              <span key={s} className="flex items-center gap-2"><span className="rounded border border-primary/50 bg-primary/10 px-3 py-2 text-primary">{s}</span>{i < a.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}</span>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {apis.map(([t, d]) => <div key={t} className="rounded-md border border-border p-3"><div className="font-mono text-sm text-fire">{t}</div><p className="text-sm text-muted-foreground">{d}</p></div>)}
          </div>
        </Panel>

        <Panel title="El Corazón del Desafío: Motor de Armonización MODIS + VIIRS">
          <div className="space-y-3 text-sm">
            <p>
              El desafío oficial exige resolver la disparidad entre los sensores térmicos de la NASA. En <b>CENTINELA</b> implementamos un motor de correspondencia espaciotemporal determinístico:
            </p>
            <div className="grid gap-3 sm:grid-cols-3 font-mono text-xs">
              <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3">
                <span className="font-bold text-amber-500">1. MODIS (Terra/Aqua)</span>
                <p className="mt-1 text-[11px] text-muted-foreground">Resolución: 1000m. Robusta serie histórica de 20+ años. Detecta anomalías térmicas globales con menor precisión de perímetro.</p>
              </div>
              <div className="rounded border border-orange-500/40 bg-orange-500/10 p-3">
                <span className="font-bold text-orange-500">2. VIIRS (SNPP / NOAA-20)</span>
                <p className="mt-1 text-[11px] text-muted-foreground">Resolución: 375m. Banda térmica I-Band. Alta sensibilidad a conatos de incendio, fuegos fríos y delineación nítida de frente.</p>
              </div>
              <div className="rounded border border-primary/50 bg-primary/10 p-3 glow-primary">
                <span className="font-bold text-primary">3. Foco Armonizado</span>
                <p className="mt-1 text-[11px] text-muted-foreground">Intersección &le; 1.5 km y &le; 12h. Centroide refinado a 375m, FRP integrado y confianza aumentada a &gt;95% (riesgo de falso positivo &lt;1%).</p>
              </div>
            </div>
          </div>
        </Panel>
        <Panel title="Hoja de ruta · 48 horas">
          <ol className="space-y-2">
            {plan.map(([d, f, t]) => <li key={d} className="grid grid-cols-[120px_1fr] gap-3 border-l-2 border-primary/40 pl-3 text-sm sm:grid-cols-[140px_180px_1fr]"><span className="font-mono text-primary">{d}</span><b>{f}</b><span className="col-span-2 text-muted-foreground sm:col-span-1">{t}</span></li>)}
          </ol>
        </Panel>
        <p className="text-center text-xs text-muted-foreground">Lextech Academy · Rodrigo Abel</p>
      </div>
    </div>
  );
}
