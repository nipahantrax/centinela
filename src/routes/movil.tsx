import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Droplets, Layers, LayoutDashboard, Thermometer, Wind, Sparkles } from "lucide-react";
import shield from "@/assets/shield.png";
import { useNasa } from "@/hooks/use-nasa";
import { NasaControls } from "@/components/centinela/NasaControls";
import { OperationsPanel } from '@/components/centinela/OperationsPanel';
import type { Horizon } from '@/lib/fire-operations';
import { TacButton } from "@/components/centinela/Brand";
import { snapshotQuery, powerQuery, gibsQuery } from "@/lib/nasa-queries";
import { MobileNav } from "@/components/centinela/MobileNav";
import { TacticalMap, type Layers as L } from "@/components/centinela/TacticalMap";
import { ignitionRisk, riskLabel } from "@/lib/centinela-data";

export const Route = createFileRoute("/movil")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Mando Táctico en Vivo" },
      { name: "description", content: "Mapa móvil de toda Bolivia: focos de calor NASA, ubicación GPS, puntos de agua y rutas orientativas." },
      { property: "og:title", content: "CENTINELA · Mando Táctico en Vivo" },
      { property: "og:description", content: "Consulta móvil de detecciones satelitales en los nueve departamentos de Bolivia." },
    ],
  }),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(snapshotQuery), context.queryClient.ensureQueryData(powerQuery(-17.31, -66.2)), context.queryClient.ensureQueryData(gibsQuery)]); },
  component: Mobile,
});

function Mobile() {
  const nasa = useNasa();
  const [selectedId, setSelectedId] = useState("");
  const w = nasa.weather;
  const risk = w ? ignitionRisk(w.temp, w.wind, w.rh) : null;
  const { label } = riskLabel(risk ?? 0);
  const [layers, setLayers] = useState<L>({ thermal: true, viirsThermal: true });
  const [horizon,setHorizon] = useState<Horizon|0>(0);
  const [open, setOpen] = useState(false);

  const selected = nasa.incidents.find(i => i.id === selectedId);
  const active = nasa.incidents.length;
  const r = 34, c = 2 * Math.PI * r;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col pb-16">
      <header className="flex items-center gap-3 px-4 py-3">
        <img src={shield} alt="" width={816} height={816} className="h-9 w-9" />
        <div className="flex-1"><div className="font-mono font-bold tracking-[0.2em]">CENTINELA</div><div className="text-xs text-muted-foreground">{nasa.regionId === 'all' ? 'Toda Bolivia' : `Bolivia · ${nasa.regionId}`}</div></div>
        <Link to="/dashboard" aria-label="Panel de comando" className="hidden rounded-md border border-border p-2 text-primary sm:block"><LayoutDashboard className="h-4 w-4" /></Link>
        {nasa.incidents[0] ? <Link to="/alerta/$id" params={{ id: nasa.incidents[0].id }} aria-label="Alertas" className="relative p-1">
          <Bell className="h-6 w-6" /><span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 font-mono text-[10px] glow-danger">{active}</span>
        </Link> : <span className="relative p-1" title="Sin detecciones activas"><Bell className="h-6 w-6 text-muted-foreground" /></span>}
        <div className="grid h-9 w-9 place-items-center rounded-full border border-primary/50 bg-primary/15 font-mono text-xs text-primary">OP</div>
      </header>

      {nasa.snapshot.harmonizationStats && nasa.snapshot.harmonizationStats.dualConfirmedClusters > 0 && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary">
          <span className="flex items-center gap-1.5 font-bold">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            {nasa.snapshot.harmonizationStats.dualConfirmedClusters} Focos Armonizados
          </span>
          <span className="text-[10px] text-muted-foreground">
            Corroboración dual: {nasa.snapshot.harmonizationStats.corroborationRatePercent}%
          </span>
        </div>
      )}

      <NasaControls nasa={nasa} compact />
      <div className="grid grid-cols-[auto_1fr] gap-3 px-4">
        <div className={`glass flex flex-col items-center rounded-xl p-3 ${risk === null ? "border-border text-muted-foreground" : risk >= 80 ? "glow-danger border-destructive/40 text-destructive" : risk >= 40 ? "border-warning/40 text-warning" : "border-success/40 text-success"}`}>
          <div className="relative h-20 w-20">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
              {risk !== null && <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - risk / 100)} />}
            </svg>
            <div className="absolute inset-0 grid place-items-center font-mono text-xl font-bold">{risk === null ? "N/D" : `${risk}%`}</div>
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">Riesgo de ignición</div>
          <div className="text-sm font-bold">{risk === null ? "Sin dato" : label}</div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary">POWER · {nasa.weatherReal ? nasa.weatherDate : "Sin dato"}</div>
          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex items-center gap-2"><Thermometer className="h-4 w-4 text-fire" /> Temperatura <b className="ml-auto font-mono">{w ? `${w.temp}°C` : "N/D"}</b></div>
            <div className="flex items-center gap-2"><Wind className="h-4 w-4 text-primary" /> Viento <b className="ml-auto font-mono">{w ? `${w.wind} km/h` : "N/D"}</b></div>
            <div className="flex items-center gap-2"><Droplets className="h-4 w-4 text-warning" /> Humedad <b className="ml-auto font-mono">{w ? `${w.rh}%` : "N/D"}</b></div>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-3"><OperationsPanel incidents={nasa.incidents} selected={selected} weather={w} weatherReal={nasa.weatherReal} weatherDate={nasa.weatherDate} regionId={nasa.regionId} horizon={horizon} onHorizon={setHorizon} snapshotSource={nasa.snapshot.source} snapshotUpdated={nasa.snapshot.updated}/></div>
      <div className="glass relative mx-4 mt-3 h-[58vh] min-h-[380px] overflow-hidden rounded-xl">
        <TacticalMap incidents={nasa.incidents} selectedId={selected?.id} center={nasa.center} zoom={nasa.region?.zoom ?? 6} national gibsDates={nasa.gibs} onPoint={nasa.setPoint} layers={layers} horizon={horizon} weather={w} wind={{ deg: w?.windDeg ?? 0, kmh: w?.wind ?? 0 }}
          onSelect={setSelectedId} />
        <TacButton aria-label="Capas" aria-expanded={open} onClick={() => setOpen(!open)} className="glass absolute left-2 top-14 z-[400] h-10 w-10 p-0"><Layers className="h-4 w-4" /></TacButton>
        {open && (
          <div className="glass absolute left-14 right-2 top-14 z-[400] space-y-1 rounded-md p-2 text-xs animate-in fade-in">
            {(["thermal", "viirs", "viirsThermal", "modis"] as (keyof L)[]).map((k) => (
              <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={Boolean(layers[k])} onChange={() => setLayers({ ...layers, [k]: !layers[k] })} />
                {{ thermal: "Focos EONET / FIRMS", viirs: "VIIRS True Color", viirsThermal: "VIIRS SNPP térmica", modis: "MODIS Anomalías térmicas" }[k]}</label>
            ))}
          </div>
        )}
        <div className="glass absolute inset-x-2 bottom-2 z-[400] flex flex-wrap justify-around gap-2 rounded-md px-2 py-1.5 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-fire" /> Focos · {nasa.snapshot.source}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Comunidades · referencias</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Áreas · referencias</span>
        </div>
      </div>
      {selected && <Link to="/alerta/$id" params={{id: selected.id}} className="mx-4 mt-3 flex min-h-11 items-center justify-center rounded border border-primary/50 text-sm text-primary">Ver detalle del punto seleccionado →</Link>}
      <MobileNav />
    </div>
  );
}
