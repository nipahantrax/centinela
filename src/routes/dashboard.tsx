import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Camera, Droplets, Mountain, RefreshCw, Route as RouteIcon, Siren, Thermometer, Wind, FileUp, Copy, Sparkles, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Brand, TacButton } from "@/components/centinela/Brand";
import { NavMenu, Panel, StatusBadge } from "@/components/centinela/Shell";
import { RiskGauge } from "@/components/centinela/RiskGauge";
import { TacticalMap, type Layers } from "@/components/centinela/TacticalMap";
import { NODES, fmtDate, ignitionRisk } from "@/lib/centinela-data";
import { useNasa } from "@/hooks/use-nasa";
import { NasaControls } from "@/components/centinela/NasaControls";
import { OperationsPanel } from '@/components/centinela/OperationsPanel';
import { nearestReference, type Horizon } from '@/lib/fire-operations';
import { classifyFrp } from "@/lib/fire-indices";
import { TacticalCompass } from "@/components/centinela/TacticalCompass";
import { HarmonizationBadge } from "@/components/centinela/HarmonizationBadge";
import { FieldChannel } from '@/components/centinela/FieldChannel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { snapshotQuery, powerQuery, gibsQuery } from "@/lib/nasa-queries";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Centro de Mando Táctico" },
      { name: "description", content: "Mapa nacional de Bolivia con detecciones NASA, clima diario, ubicación GPS y rutas orientativas." },
      { property: "og:title", content: "CENTINELA · Centro de Mando Táctico" },
      { property: "og:description", content: "Detecciones satelitales reales para los nueve departamentos de Bolivia." },
    ],
  }),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(snapshotQuery), context.queryClient.ensureQueryData(powerQuery(-17.31, -66.2)), context.queryClient.ensureQueryData(gibsQuery)]); },
  component: Dashboard,
});

const LAYER_LABELS: [keyof Layers, string][] = [
  ["thermal", "Focos EONET / FIRMS"], ["viirs", "VIIRS True Color"], ["viirsThermal", "VIIRS SNPP Térmica"], ["modis", "MODIS Anomalías térmicas"],
];

function Dashboard() {
  const nasa = useNasa();
  const { weather, incidents, syncing, center } = nasa;
  const lastSync = nasa.weatherDate ?? "Sin dato";
  const [nodeId, setNodeId] = useState("tunari");
  const [selectedId, setSelectedId] = useState("");
  const [layers, setLayers] = useState<Layers>({ thermal: true, viirsThermal: true });
  const [horizon, setHorizon] = useState<Horizon | 0>(0);
  const [channelOpen, setChannelOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "harmonized" | "critical" | "near">("all");

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
    toast.info("Consulta NASA completada; revisa la fuente y fecha del dato.");
  };

  return (
    <div className="tac-grid min-h-screen lg:h-screen lg:overflow-hidden">
      <div className="grid gap-3 p-3 lg:h-full lg:grid-cols-[300px_1fr_340px]">
        {/* LEFT */}
        <aside className="flex flex-col gap-3 lg:overflow-y-auto">
          <Panel><Brand /></Panel>
          <Panel title="Nodo de jerarquía">
            <select value={nodeId} onChange={(e) => { setNodeId(e.target.value); const n = NODES.find(n => n.id === e.target.value); if (n) { nasa.setRegion("Cochabamba"); nasa.setPoint(n.center); } }} className="h-10 w-full rounded-md border border-input bg-background px-2 font-mono text-sm outline-none focus:border-primary">
              {NODES.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </Panel>
          <Panel title="NASA POWER · Promedio diario" right={<span className="font-mono text-[10px] text-muted-foreground">{lastSync}</span>}>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric icon={Thermometer} label="Temp" value={weather ? `${weather.temp}°C` : "N/D"} tone="text-fire" />
              <Metric icon={Wind} label="Viento" value={weather ? `${weather.wind}` : "N/D"} sub={weather ? `km/h ${weather.windDir}` : "km/h"} tone="text-primary" />
              <Metric icon={Droplets} label="HR" value={weather ? `${weather.rh}%` : "N/D"} tone={weather && weather.rh < 20 ? "text-destructive" : "text-warning"} />
            </div>
            <TacButton className="mt-3 w-full" onClick={refreshSensors} disabled={syncing}>
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} /> [Actualizar sensores NASA]
            </TacButton>
          </Panel>
          <Panel className={(risk ?? 0) >= 80 ? "glow-danger border-destructive/50" : ""}>{risk === null ? <p className="text-sm text-muted-foreground">Riesgo de ignición: sin dato NASA POWER.</p> : <RiskGauge value={risk} />}</Panel>
          <TacticalCompass temp={weather?.temp} rh={weather?.rh} windKmH={weather?.wind} windDeg={weather?.windDeg} dateStr={nasa.weatherDate} />
          <Panel><NavMenu /></Panel>
        </aside>

        {/* CENTER */}
        <main className="flex min-h-0 flex-col gap-3">
          <Panel className="!p-2 space-y-2">
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
            <div className="flex flex-wrap gap-2">
              {LAYER_LABELS.map(([k, l]) => (
                <TacButton key={k} onClick={() => setLayers((s) => ({ ...s, [k]: !s[k] }))}
                  className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase transition-colors ${layers[k] ? "border-primary/60 bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
                  {layers[k] ? "●" : "○"} {l}
                </TacButton>
              ))}
            </div>
          </Panel>
          <div className="glass relative h-[55vh] min-h-[360px] overflow-hidden rounded-lg lg:h-auto lg:flex-1">
            <TacticalMap incidents={filteredIncidents} selectedId={selected?.id} onSelect={setSelectedId} center={center} zoom={nasa.region?.zoom ?? 6} national gibsDates={nasa.gibs} onPoint={nasa.setPoint} layers={layers} horizon={horizon} weather={weather} wind={{ deg: weather?.windDeg ?? 0, kmh: weather?.wind ?? 0 }} />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Panel title="Estado NASA" className="max-h-40 overflow-y-auto">
              <ul className="space-y-1 font-mono text-[11px]">
                {nasa.snapshot.messages.map((m, i) => <li key={i} className="text-muted-foreground">{m}</li>)}
                <li className="text-primary">Última actualización: {fmtDate(nasa.snapshot.updated)} · Fuente: {nasa.snapshot.source}</li>
              </ul>
            </Panel>
            <TacButton tone="danger" className="h-full min-h-14 px-6 text-sm" onClick={() => setChannelOpen(true)}>
              <Siren className="h-5 w-5" /> [SOS / Alerta comunitaria]
            </TacButton>
          </div>
        </main>

        {/* RIGHT */}
        <aside className="flex flex-col gap-3 lg:overflow-y-auto">
          <Panel title={`Incidentes filtrados (${filteredIncidents.filter((i) => i.status !== "Controlado").length} activos)`}>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {filteredIncidents.map((i) => (
                <li key={i.id}>
                  <button onClick={() => setSelectedId(i.id)} className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left transition-colors ${i.id === selectedId ? "bg-primary/15 ring-1 ring-primary/50" : "hover:bg-secondary/60"}`}>
                    <span>
                      <span className="flex items-center gap-1 font-mono text-xs text-primary">
                        {i.source === "MODIS+VIIRS armonizado" && <Sparkles className="h-3 w-3 text-amber-400" />}
                        {i.id}
                      </span>
                      <span className="text-xs text-muted-foreground">{i.zone}</span>
                    </span>
                    <StatusBadge s={i.status} />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          {selected ? <>
          <Panel title="Inspector táctico" right={<StatusBadge s={selected.status} />} className={selected.status === "Activo" ? "border-destructive/40" : ""}>
            <p className="mb-2 text-[11px] text-warning">Detección satelital por verificar · logística no disponible</p>
            <div key={selected.id} className="animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className="break-all font-mono text-sm font-bold text-fire">{selected.id}</span>
                {selected.source === "MODIS+VIIRS armonizado" && (
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">ARMONIZADO</span>
                )}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <Dt k="Fecha/hora" v={fmtDate(selected.date)} />
                <Dt k="Zona" v={selected.zone} />
                <Dt k="Latitud" v={selected.lat.toFixed(4) + "°"} />
                <Dt k="Longitud" v={selected.lng.toFixed(4) + "°"} />
                <Dt k="Confianza" v={selected.confidence === null ? "N/D" : `${selected.confidence}%`} />
                <Dt k="FRP" v={selected.frp === null ? "N/D" : `${selected.frp} MW`} />
                <Dt k="Severidad" v={frpInfo ? frpInfo.category : "N/D"} />
                <Dt k="Fuente" v={selected.source} />
              </dl>
              {frpInfo && (
                <div className="mt-3 rounded border border-border/60 bg-background/50 p-2 text-xs">
                  <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>Agua táctica recom.:</span>
                    <span className="font-bold text-primary">~{frpInfo.recommendedWaterLiters} L</span>
                  </div>
                  <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{frpInfo.tacticalAdvice}</p>
                </div>
              )}
              <TacButton
                tone="primary"
                className="mt-3 w-full text-xs"
                onClick={() => {
                  const text = `CENTINELA ICS-209 · REPORTE TÁCTICO\nFoco: ${selected.id}\nZona: ${selected.zone}\nCoordenadas: ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}\nIntensidad (FRP): ${selected.frp ?? 'N/D'} MW (${frpInfo?.category ?? 'N/D'})\nFuente Satelital: ${selected.source}\nConfianza: ${selected.confidence ?? 'N/D'}%\nAgua recomendada: ~${frpInfo?.recommendedWaterLiters ?? 3000} L\nRecomendación: ${frpInfo?.tacticalAdvice ?? 'Evaluar en terreno'}`;
                  void navigator.clipboard.writeText(text);
                  toast.success("Reporte táctico ICS-209 copiado al portapapeles");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> [Copiar despacho ICS-209]
              </TacButton>
            </div>
          </Panel>
          <Panel title="Logística local GAMC">
            <div className="space-y-2 text-xs">
              <Row icon={Droplets} k="Punto de agua más cercano" v={selected.hydrant.distKm === null ? "No verificado" : `${selected.hydrant.distKm} km`} sub={selected.hydrant.name} />
              <Row icon={RouteIcon} k="Ruta de acceso" v={selected.route.state} sub="Requiere validación local"
                tone={selected.route.state === "Ruta Habilitada" ? "text-success" : selected.route.state === "Ruta Restringida" ? "text-warning" : "text-destructive"} />
              <Row icon={Mountain} k="Altitud del terreno" v={selected.altitude === null ? "No verificada" : `${selected.altitude} m s.n.m.`} />
            </div>
          </Panel>
          <div className="grid grid-cols-2 gap-2">
            <TacButton tone="ghost" onClick={() => { toast.info("Adjuntos no habilitados. Puedes compartir coordenadas por WhatsApp desde SOS."); }}><Camera className="h-3.5 w-3.5" /> Evidencia</TacButton>
            <TacButton tone="ghost" onClick={() => setChannelOpen(true)}><FileUp className="h-3.5 w-3.5" /> Actualización</TacButton>
          </div>
          </> : <Panel><p className="text-sm text-muted-foreground">Sin detecciones disponibles en este departamento. Esto no descarta incendios.</p></Panel>}
        </aside>
      </div>

      <Dialog open={channelOpen} onOpenChange={setChannelOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Canal de campo / SOS</DialogTitle></DialogHeader><FieldChannel regionId={nasa.regionId}/></DialogContent></Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub, tone }: { icon: typeof Wind; label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <Icon className={`mx-auto h-4 w-4 ${tone}`} />
      <div className={`font-mono text-lg font-bold ${tone}`}>{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{sub ?? label}</div>
    </div>
  );
}
function Dt({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="break-words font-mono">{v}</dd></div>;
}
function Row({ icon: Icon, k, v, sub, tone = "text-foreground" }: { icon: typeof Wind; k: string; v: string; sub?: string; tone?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-background/40 p-2">
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <div className="flex-1"><div className="text-[10px] uppercase text-muted-foreground">{k}</div><div className={`font-mono font-semibold ${tone}`}>{v}</div>{sub && <div className="text-muted-foreground">{sub}</div>}</div>
    </div>
  );
}
