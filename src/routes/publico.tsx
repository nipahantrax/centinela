import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone } from "lucide-react";
import { Brand } from "@/components/centinela/Brand";
import { LanguageSelector } from "@/components/centinela/LanguageSelector";
import { Panel, StatusBadge } from "@/components/centinela/Shell";
import { RiskGauge } from "@/components/centinela/RiskGauge";
import { ignitionRisk } from "@/lib/centinela-data";
import { departmentAt } from "@/lib/nasa-data";
import { powerQuery, snapshotQuery } from "@/lib/nasa-queries";
import { COE_CONTACTS, NATIONAL_CONTACTS } from "@/lib/emergency-contacts";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/publico")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Consulta Ciudadana Tunari (Cochabamba)" },
      { name: "description", content: "Consulta vecinal de riesgo de incendios y focos activos en los 11 municipios del Parque Tunari y Cochabamba." },
      { property: "og:title", content: "CENTINELA · Consulta Ciudadana Tunari" },
      { property: "og:description", content: "Estado público de incendios forestales en Cochabamba y Parque Tunari con telemetría NASA." },
    ],
  }),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(snapshotQuery), context.queryClient.ensureQueryData(powerQuery(-17.31, -66.2))]); },
  component: Publico,
});

function Publico() {
  const snapshot = useSuspenseQuery(snapshotQuery).data;
  const power = useSuspenseQuery(powerQuery(-17.31, -66.2)).data;
  const w = power.weather;
  const active = snapshot.incidents.filter((i) => i.status !== "Controlado");
  return (
    <div className="tac-grid min-h-screen">
      <div className="mx-auto max-w-3xl space-y-4 px-3 sm:px-4 py-6 pb-24 lg:pb-8">
        <div className="flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-3">
            <LanguageSelector compact />
            <Link to="/" className="flex items-center gap-1 text-sm text-primary"><ArrowLeft className="h-4 w-4" />Volver</Link>
          </div>
        </div>
        <h1 className="text-2xl font-bold">Consulta ciudadana</h1>
        <p className="text-sm text-muted-foreground">Datos reales NASA (FIRMS / EONET / POWER). Las detecciones satelitales están pendientes de verificación en campo; ante una emergencia llama al 119.</p>
        <Link to="/movil" className="flex min-h-12 items-center justify-center rounded-md border border-primary/50 bg-primary/10 text-primary font-bold">Abrir mapa interactivo Tunari (11 Municipios) →</Link>
        <Panel title="Clima de referencia · Cochabamba">{w ? <RiskGauge value={ignitionRisk(w.temp, w.wind, w.rh)} /> : <p className="text-sm text-muted-foreground">Riesgo de ignición: sin dato NASA POWER disponible.</p>}
          <p className="mt-2 text-xs text-muted-foreground">POWER · promedio diario {power.date ?? 'sin fecha'} en Cochabamba. Estimación de CENTINELA, no riesgo nacional ni aviso oficial.</p>
          <p className="mt-3 text-sm text-muted-foreground">Evita quemas, fogatas y arrojar colillas. Si ves humo, llama al <b className="text-foreground">119</b>.</p></Panel>
        <Panel title={`Detecciones satelitales activas (${active.length})`}>
          <p className="mb-2 text-xs text-muted-foreground">Fuente: NASA {snapshot.source} · actualizado {formatDateTime(snapshot.updated)}. Detecciones satelitales pendientes de verificación en campo; no son órdenes de evacuación.</p>
          {active.length ? <>
            <ul className="divide-y divide-border">
              {active.slice(0, 20).map((i) => <li key={i.id} className="py-2 text-sm"><Link to="/alerta/$id" params={{id:i.id}} className="flex min-h-11 items-center justify-between gap-2"><span>{departmentAt(i.lat, i.lng) ?? i.zone}<span className="block text-xs text-primary">Ver coordenadas y detalle →</span></span><StatusBadge s={i.status} /></Link></li>)}
            </ul>
            {active.length > 20 && <p className="pt-2 text-xs text-muted-foreground">Mostrando 20 de {active.length} detecciones. El mapa táctico muestra todas.</p>}
          </> : <p className="text-sm text-muted-foreground">No hay detecciones disponibles en esta consulta. Esto no descarta incendios: reporta cualquier humo al 119.</p>}
          {snapshot.messages.map((message, idx) => <p key={`${message}-${idx}`} className="mt-2 text-xs text-warning">{message}</p>)}
        </Panel>
        <Panel title="Contactos de emergencia">
          <ul className="grid gap-2 font-mono text-sm sm:grid-cols-2">
            {NATIONAL_CONTACTS.map((c) => <li key={c.number} className="flex items-center gap-2 rounded border border-border p-2"><Phone className="h-4 w-4 text-primary" />{c.name} <a className="ml-auto font-bold text-primary" href={`tel:${c.number}`}>{c.number}</a><span className="text-[10px] uppercase text-success">Verificado</span></li>)}
          </ul>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">COE departamental</p>
          <ul className="mt-1 grid gap-2 text-sm sm:grid-cols-3">
            {COE_CONTACTS.map((c) => <li key={c.scope} className="flex flex-col gap-1 rounded border border-border p-2"><span className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{c.name}</span><span className="text-[10px] uppercase tracking-wider text-warning">Pendiente de verificación{c.number ? ` · ${c.number} sin confirmar` : " · sin número oficial"}</span></li>)}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Los números del COE solo se mostrarán como oficiales cuando una fuente autorizada los confirme. Ante una emergencia, llama al 119 o 110.</p>
        </Panel>
      </div>
    </div>
  );
}
