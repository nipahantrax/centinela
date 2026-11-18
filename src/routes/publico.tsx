import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Shield, Map } from "lucide-react";
import { Brand } from "@/components/centinela/Brand";
import { Panel, StatusBadge } from "@/components/centinela/Shell";
import { RiskGauge } from "@/components/centinela/RiskGauge";
import { ignitionRisk } from "@/lib/centinela-data";
import { departmentAt } from "@/lib/nasa-data";
import { powerQuery, snapshotQuery } from "@/lib/nasa-queries";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/publico")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Consulta Ciudadana Orbital" },
      {
        name: "description",
        content:
          "Consulta pública del riesgo de incendios y focos satelitales NASA en tiempo real para Bolivia.",
      },
      { property: "og:title", content: "CENTINELA · Consulta Ciudadana Orbital" },
      {
        property: "og:description",
        content: "Estado de incendios forestales en Bolivia para vecinos y comunidades.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(snapshotQuery),
      context.queryClient.ensureQueryData(powerQuery(-17.31, -66.2)),
    ]);
  },
  component: Publico,
});

function Publico() {
  const snapshot = useSuspenseQuery(snapshotQuery).data;
  const power = useSuspenseQuery(powerQuery(-17.31, -66.2)).data;
  const w = power.weather;
  const active = snapshot.incidents.filter((i) => i.status !== "Controlado");

  return (
    <div className="w-full min-h-screen bg-[#060913] hud-bg text-slate-100 font-sans selection:bg-cyan-500/30 py-6 px-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header */}
        <header className="glass rounded-2xl p-4 border border-cyan-500/20 flex items-center justify-between">
          <Brand />
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 font-mono text-xs text-cyan-300 hover:border-cyan-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </Link>
        </header>

        <div>
          <h1 className="font-mono text-2xl font-black tracking-wider text-white">
            PORTAL DE CONSULTA VECINAL Y CIUDADANA
          </h1>
          <p className="font-mono text-xs text-slate-400 mt-1">
            Datos satelitales NASA en tiempo real (FIRMS / EONET / POWER). Ante humo o fuego visible, llama de inmediato al 119.
          </p>
        </div>

        <Link
          to="/movil"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/60 bg-cyan-500/25 font-mono text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:bg-cyan-500/35 active:scale-[0.98]"
        >
          <Map className="h-5 w-5 text-cyan-300" />
          <span>Abrir Mapa Interactivo de Toda Bolivia</span>
        </Link>

        {/* Riesgo de Referencia */}
        <Panel title="Riesgo Atmosférico de Referencia · Cochabamba">
          {w ? (
            <RiskGauge value={ignitionRisk(w.temp, w.wind, w.rh)} />
          ) : (
            <p className="font-mono text-xs text-slate-400">
              Riesgo de ignición: sin lectura NASA POWER disponible en este momento.
            </p>
          )}
          <p className="mt-2 font-mono text-[10px] text-slate-500">
            POWER · promedio diario {power.date ?? "en curso"} para Cochabamba y Parque Tunari.
          </p>
        </Panel>

        {/* Focos Activos */}
        <Panel title={`Anomalías Térmicas Activas (${active.length})`}>
          <p className="mb-3 font-mono text-[10px] text-slate-400">
            Fuente: NASA {snapshot.source} · Sincronizado: {formatDateTime(snapshot.updated)}. Toda detección requiere confirmación visual en terreno.
          </p>

          {active.length ? (
            <>
              <ul className="divide-y divide-slate-800/80 font-mono text-xs">
                {active.slice(0, 20).map((i) => (
                  <li key={i.id} className="py-2.5">
                    <Link
                      to="/alerta/$id"
                      params={{ id: i.id }}
                      className="flex items-center justify-between gap-2 hover:text-cyan-300 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-white">
                          {departmentAt(i.lat, i.lng) ?? i.zone}
                        </span>
                        <span className="block text-[10px] text-cyan-400 mt-0.5">
                          Foco {i.id} · Ver coordenadas y mapa →
                        </span>
                      </div>
                      <StatusBadge s={i.status} />
                    </Link>
                  </li>
                ))}
              </ul>
              {active.length > 20 && (
                <p className="pt-2 font-mono text-[10px] text-slate-500 text-center">
                  Mostrando las 20 detecciones prioritarias. El Centro de Mando Táctico muestra todas las capas.
                </p>
              )}
            </>
          ) : (
            <p className="font-mono text-xs text-slate-400 py-3 text-center">
              No hay anomalías térmicas reportadas en este cuadrante.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
