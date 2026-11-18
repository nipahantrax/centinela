import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Flame, Satellite, Timer, Shield, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Brand, TacButton } from "@/components/centinela/Brand";
import { Panel, StatusBadge } from "@/components/centinela/Shell";
import { fmtDate } from "@/lib/centinela-data";
import { departmentAt } from "@/lib/nasa-data";
import { snapshotQuery } from "@/lib/nasa-queries";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Telemetría Estratégica y Auditoría" },
      {
        name: "description",
        content: "KPIs y telemetría satelital NASA FIRMS/EONET para Bolivia.",
      },
      { property: "og:title", content: "CENTINELA · Telemetría Estratégica" },
      {
        property: "og:description",
        content: "Detecciones satelitales térmicas en Bolivia con auditoría criptográfica SHA-256.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(snapshotQuery);
  },
  component: Reportes,
});

const tip = {
  contentStyle: {
    background: "rgba(8, 15, 30, 0.95)",
    border: "1px solid rgba(0, 229, 255, 0.3)",
    borderRadius: "12px",
    fontFamily: "var(--font-mono)",
    fontSize: 11,
    color: "#fff",
  },
};

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function Reportes() {
  const snapshot = useSuspenseQuery(snapshotQuery).data;
  const all = snapshot.incidents;
  const [dept, setDept] = useState("all");
  const [source, setSource] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hash, setHash] = useState("");

  const rows = useMemo(
    () =>
      all.filter(
        (i) =>
          (dept === "all" || departmentAt(i.lat, i.lng) === dept) &&
          (source === "all" || i.source === source) &&
          (!from || i.date.slice(0, 10) >= from) &&
          (!to || i.date.slice(0, 10) <= to)
      ),
    [all, dept, source, from, to]
  );

  const byDept = useMemo(() => {
    const m = new Map<string, number>();
    all.forEach((i) => {
      const d = departmentAt(i.lat, i.lng) ?? "Sin clasificar";
      m.set(d, (m.get(d) ?? 0) + 1);
    });
    return [...m]
      .map(([departamento, focos]) => ({ departamento, focos }))
      .sort((a, b) => b.focos - a.focos);
  }, [all]);

  const series = useMemo(() => {
    const m = new Map<string, { dia: string; modis: number; viirs: number; armonizado: number; eonet: number }>();
    all.forEach((i) => {
      const day = i.date.slice(0, 10);
      const row = m.get(day) ?? { dia: day, modis: 0, viirs: 0, armonizado: 0, eonet: 0 };
      if (i.source === "MODIS") row.modis += 1;
      else if (i.source === "VIIRS") row.viirs += 1;
      else if (i.source === "MODIS+VIIRS armonizado") row.armonizado += 1;
      else row.eonet += 1;
      m.set(day, row);
    });
    return [...m.values()].sort((a, b) => a.dia.localeCompare(b.dia));
  }, [all]);

  const frpTotal = all.reduce((a, i) => a + (i.frp ?? 0), 0);
  const departments = byDept.length;

  const exportPdf = async () => {
    const h = await sha256(JSON.stringify(rows) + snapshot.updated);
    setHash(h);
    toast.success("Reporte auditado · Hash criptográfico SHA-256 generado");
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="w-full min-h-screen bg-[#060913] hud-bg text-slate-100 font-sans selection:bg-cyan-500/30 py-6 px-4">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header */}
        <header className="glass rounded-2xl p-4 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-4">
          <Brand />
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 font-mono text-xs uppercase tracking-wider text-cyan-300 hover:border-cyan-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Centro de Mando</span>
            </Link>
            <TacButton tone="cyan" onClick={exportPdf} className="text-xs">
              <Download className="h-4 w-4" />
              <span>Exportar PDF / Auditoría</span>
            </TacButton>
          </div>
        </header>

        <div>
          <h1 className="font-mono text-2xl font-black tracking-wider text-white">
            TELEMETRÍA ESTRATÉGICA Y AUDITORÍA NASA
          </h1>
          <p className="font-mono text-xs text-slate-400 mt-1">
            Datos reales NASA · Fuente: {snapshot.source} · Sincronizado: {fmtDate(snapshot.updated)}.
          </p>
        </div>

        {/* KPIs Holográficos */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            icon={Flame}
            label="Focos Detectados"
            value={String(all.length)}
            delta="FIRMS 2 días + EONET 30 días"
            tone="text-red-400"
            glow="rgba(255,51,75,0.2)"
          />
          <Kpi
            icon={Satellite}
            label="Eventos EONET"
            value={String(snapshot.eonetCount)}
            delta="Categoría Wildfires Bolivia"
            tone="text-cyan-300"
            glow="rgba(0,229,255,0.2)"
          />
          <Kpi
            icon={Sparkles}
            label="FRP Total Acumulado"
            value={`${frpTotal.toFixed(1)} MW`}
            delta="Potencia radiativa total"
            tone="text-amber-400"
            glow="rgba(245,158,11,0.2)"
          />
          <Kpi
            icon={Timer}
            label="Departamentos"
            value={String(departments)}
            delta="Con anomalías térmicas activas"
            tone="text-emerald-400"
            glow="rgba(16,185,129,0.2)"
          />
        </div>

        {/* Gráficos */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Detecciones Diarias por Sensor">
            {series.length ? (
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={series}>
                    <CartesianGrid stroke="rgba(56,189,248,0.1)" strokeDasharray="3 3" />
                    <XAxis dataKey="dia" stroke="#64748b" fontSize={10} fontVariant="mono" />
                    <YAxis allowDecimals={false} stroke="#64748b" fontSize={10} fontVariant="mono" />
                    <Tooltip {...tip} />
                    <Legend wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 11 }} />
                    <Line dataKey="modis" name="MODIS (1km)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line dataKey="viirs" name="VIIRS (375m)" stroke="#38bdf8" strokeWidth={2} dot={false} />
                    <Line dataKey="armonizado" name="Armonizado" stroke="#00e5ff" strokeWidth={3} dot={{ r: 3 }} />
                    <Line dataKey="eonet" name="EONET" stroke="#ff334b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="font-mono text-xs text-slate-400">Sin detecciones en el período.</p>
            )}
          </Panel>

          <Panel title="Distribución Territorial por Departamento">
            {byDept.length ? (
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={byDept}>
                    <CartesianGrid stroke="rgba(56,189,248,0.1)" strokeDasharray="3 3" />
                    <XAxis dataKey="departamento" stroke="#64748b" fontSize={10} fontVariant="mono" />
                    <YAxis allowDecimals={false} stroke="#64748b" fontSize={10} fontVariant="mono" />
                    <Tooltip {...tip} />
                    <Bar dataKey="focos" fill="#00e5ff" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="font-mono text-xs text-slate-400">Sin datos territoriales.</p>
            )}
          </Panel>
        </div>

        {/* Tabla de Focos con Filtros */}
        <Panel title="Registro Histórico Detallado">
          <div className="mb-3 flex flex-wrap gap-2 font-mono text-xs">
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="rounded-xl border border-cyan-500/30 bg-slate-900/80 px-2.5 py-1.5 text-cyan-200 outline-none"
            >
              <option value="all">Todos los departamentos</option>
              {byDept.map((d) => (
                <option key={d.departamento} value={d.departamento}>
                  {d.departamento}
                </option>
              ))}
            </select>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded-xl border border-cyan-500/30 bg-slate-900/80 px-2.5 py-1.5 text-cyan-200 outline-none"
            >
              <option value="all">Todas las fuentes</option>
              <option value="MODIS+VIIRS armonizado">MODIS+VIIRS armonizado</option>
              <option value="VIIRS">VIIRS</option>
              <option value="MODIS">MODIS</option>
              <option value="EONET">EONET</option>
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-white"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-white"
            />
            <span className="self-center font-mono text-xs text-slate-400">
              {rows.length} registros filtrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-cyan-500/20 text-[10px] uppercase tracking-wider text-cyan-400">
                <tr>
                  {["ID Foco", "Fecha", "Departamento", "Confianza", "FRP", "Fuente", "Estado"].map((h) => (
                    <th key={h} className="px-3 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.map((i) => (
                  <tr key={i.id} className="hover:bg-cyan-500/5 transition-colors">
                    <td className="px-3 py-2.5 font-bold text-cyan-300">
                      <Link to="/alerta/$id" params={{ id: i.id }}>
                        {i.id}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{fmtDate(i.date)}</td>
                    <td className="px-3 py-2.5 text-slate-200">{departmentAt(i.lat, i.lng) ?? "—"}</td>
                    <td className="px-3 py-2.5 text-cyan-300">
                      {i.confidence === null ? "N/D" : `${i.confidence}%`}
                    </td>
                    <td className="px-3 py-2.5 font-black text-amber-400">
                      {i.frp === null ? "N/D" : `${i.frp} MW`}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400">{i.source}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge s={i.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <p className="py-6 text-center font-mono text-xs text-slate-500">
                Sin detecciones que coincidan con los filtros aplicados.
              </p>
            )}
          </div>
        </Panel>

        {/* Resumen y Hash SHA-256 */}
        <Panel title="Resumen Ejecutivo y Certificación Criptográfica">
          <p className="text-xs text-slate-400 leading-relaxed">
            NASA reporta {all.length} detecciones térmicas en territorio boliviano ({snapshot.eonetCount} eventos EONET
            abiertos, resto FIRMS VIIRS/MODIS de las últimas 48 horas), con un FRP acumulado de {frpTotal.toFixed(1)} MW
            en {departments} departamento(s). Toda detección satelital requiere verificación de brigadas en campo antes
            de despliegue hídrico.
          </p>
          {hash && (
            <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-2.5 font-mono text-[11px] text-emerald-300">
              <span className="font-bold">HASH DE AUDITORÍA SHA-256 (INMUTABLE):</span>
              <p className="mt-0.5 break-all text-emerald-400">{hash}</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  tone,
  glow,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  delta: string;
  tone: string;
  glow: string;
}) {
  return (
    <div
      className="glass rounded-2xl p-4 border border-cyan-500/15 flex flex-col justify-between"
      style={{ boxShadow: `0 4px 20px -2px ${glow}` }}
    >
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
        <Icon className={`h-5 w-5 ${tone}`} />
      </div>
      <div className={`mt-2 font-mono text-3xl font-black ${tone}`}>{value}</div>
      <div className="font-mono text-[9px] text-slate-500 mt-1">{delta}</div>
    </div>
  );
}
