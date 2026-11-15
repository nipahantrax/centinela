import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Flame, Satellite, Timer } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Brand, TacButton } from "@/components/centinela/Brand";
import { Panel, StatusBadge } from "@/components/centinela/Shell";
import { LanguageSelector } from "@/components/centinela/LanguageSelector";
import { useI18n } from "@/lib/i18n";
import { fmtDate, INCIDENTS, NODES } from "@/lib/centinela-data";
import { departmentAt, MUNICIPALITIES } from "@/lib/nasa-data";
import { snapshotQuery } from "@/lib/nasa-queries";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Reporte Estratégico Tunari (Cochabamba)" },
      { name: "description", content: "KPIs y telemetría satelital NASA de los 11 municipios del Parque Nacional Tunari y eje metropolitano." },
      { property: "og:title", content: "CENTINELA · Reporte Estratégico Tunari" },
      { property: "og:description", content: "Reporte de incendios y auditoría geoespacial para los 11 municipios de Cochabamba." },
    ],
  }),
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(snapshotQuery); },
  component: Reportes,
});

const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 12 } };

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function Reportes() {
  const { t } = useI18n();
  const snapshot = useSuspenseQuery(snapshotQuery).data;
  const all = snapshot.incidents.length > 0 ? snapshot.incidents : INCIDENTS;
  const [dept, setDept] = useState("all");
  const [source, setSource] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hash, setHash] = useState("");

  const byMuni = useMemo(() => {
    const m = new Map<string, number>();
    all.forEach((i) => {
      let muni = "Parque Tunari";
      const z = i.zone.toLowerCase();
      for (const node of NODES) {
        if (z.includes(node.municipality.toLowerCase()) || z.includes(node.id)) {
          muni = node.municipality;
          break;
        }
      }
      m.set(muni, (m.get(muni) ?? 0) + 1);
    });
    return [...m].map(([municipio, focos]) => ({ municipio, focos })).sort((a, b) => b.focos - a.focos);
  }, [all]);

  const rows = useMemo(() => all.filter((i) => {
    if (dept !== "all") {
      const z = i.zone.toLowerCase();
      const node = NODES.find((n) => n.municipality.toLowerCase() === dept.toLowerCase() || n.id === dept.toLowerCase());
      const match = node ? (z.includes(node.municipality.toLowerCase()) || z.includes(node.id)) : departmentAt(i.lat, i.lng) === dept;
      if (!match) return false;
    }
    return (source === "all" || i.source === source)
      && (!from || i.date.slice(0, 10) >= from) && (!to || i.date.slice(0, 10) <= to);
  }), [all, dept, source, from, to]);

  const byDept = byMuni;

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

  const exportGeoJson = () => {
    const geojson = {
      type: "FeatureCollection",
      properties: {
        fecha: new Date().toISOString(),
        totalFocos: rows.length,
        sistema: "CENTINELA · Auditoría Geoespacial GAMC Cochabamba 2026",
      },
      features: rows.map((i) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [i.lng, i.lat],
        },
        properties: {
          id: i.id,
          zona: i.zone,
          frp: i.frp,
          confianza: i.confidence,
          fuente: i.source,
          fecha: i.date,
          departamento: departmentAt(i.lat, i.lng),
          estado: i.status,
        },
      })),
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CENTINELA_AUDITORIA_SIG_${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Capa GeoJSON descargada para SIG Municipal GAMC.");
  };

  const exportPdf = async () => {
    const h = await sha256(JSON.stringify(rows) + snapshot.updated);
    setHash(h);
    toast.success("Reporte generado · hash de auditoría registrado");
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="tac-grid min-h-screen">
      <div className="mx-auto max-w-7xl space-y-4 px-3 sm:px-4 py-6 pb-24 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Brand />
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSelector compact />
            <Link to="/dashboard" className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-primary"><ArrowLeft className="h-4 w-4" />{t("navDashboard")}</Link>
            <TacButton tone="ghost" onClick={exportGeoJson}><Download className="h-4 w-4 text-primary" />[{t("exportGeoJson")}]</TacButton>
            <TacButton onClick={exportPdf}><Download className="h-4 w-4" />[Exportar reporte PDF]</TacButton>
          </div>
        </div>
        <h1 className="text-2xl font-bold">Reporte estratégico y auditoría</h1>
        <p className="text-sm text-muted-foreground">Datos reales NASA · Fuente: {snapshot.source} · Actualizado {fmtDate(snapshot.updated)}. Detecciones satelitales pendientes de verificación en campo.</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={Flame} label="Focos detectados" value={String(all.length)} delta="FIRMS 2 días + EONET 30 días" tone="text-fire" />
          <Kpi icon={Satellite} label="Eventos EONET Tunari" value={String(snapshot.eonetCount)} delta="Categoría wildfires Tunari" tone="text-primary" />
          <Kpi icon={Flame} label="FRP acumulado" value={`${frpTotal.toFixed(1)} MW`} delta="Suma de potencia radiativa" tone="text-destructive" />
          <Kpi icon={Timer} label="Municipios bajo monitoreo" value={String(byMuni.length)} delta="11 Municipios Tunari GAMC" tone="text-success" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Detecciones por día (real)">
            {series.length ? <div className="h-64"><ResponsiveContainer><LineChart data={series}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={11} /><YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} /><Tooltip {...tip} /><Legend />
              <Line dataKey="modis" name="MODIS" stroke="var(--chart-4)" strokeWidth={2} />
              <Line dataKey="viirs" name="VIIRS" stroke="var(--chart-1)" strokeWidth={2} />
              <Line dataKey="armonizado" name="Armonizado (MODIS+VIIRS)" stroke="var(--primary)" strokeWidth={3} />
              <Line dataKey="eonet" name="EONET" stroke="var(--chart-2)" strokeWidth={2} />
            </LineChart></ResponsiveContainer></div> : <p className="text-sm text-muted-foreground">Sin detecciones NASA en el período disponible.</p>}
          </Panel>
          <Panel title="Detecciones por Municipio (11 Municipios Tunari)">
            {byMuni.length ? <div className="h-64"><ResponsiveContainer><BarChart data={byMuni}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="municipio" stroke="var(--muted-foreground)" fontSize={11} /><YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} /><Tooltip {...tip} />
              <Bar dataKey="focos" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
            </BarChart></ResponsiveContainer></div> : <p className="text-sm text-muted-foreground">Sin detecciones NASA en el período disponible.</p>}
          </Panel>
        </div>
        <Panel title="Historial de detecciones (real)">
          <div className="mb-3 flex flex-wrap gap-2 font-mono text-xs">
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="rounded border border-input bg-background px-2 py-1.5 cursor-pointer">
              <option value="all">Todos los 11 municipios (Tunari)</option>
              {NODES.map((n) => <option key={n.id} value={n.municipality}>{n.name}</option>)}
            </select>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded border border-input bg-background px-2 py-1.5">
              <option value="all">Todas las fuentes</option>
              <option value="MODIS+VIIRS armonizado">MODIS+VIIRS armonizado</option>
              <option>VIIRS</option>
              <option>MODIS</option>
              <option>EONET</option>
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-input bg-background px-2 py-1.5" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-input bg-background px-2 py-1.5" />
            <span className="self-center text-muted-foreground">{rows.length} resultados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="font-mono text-[10px] uppercase text-muted-foreground"><tr>{["ID", "Fecha", "Municipio / Zona", "Confianza", "FRP", "Fuente", "Estado"].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}</tr></thead>
              <tbody>{rows.map((i) => (
                <tr key={i.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="max-w-40 truncate px-2 py-2 font-mono text-primary"><Link to="/alerta/$id" params={{ id: i.id }}>{i.id}</Link></td>
                  <td className="px-2 font-mono text-xs">{fmtDate(i.date)}</td><td className="px-2 font-medium">{i.zone}</td>
                  <td className="px-2 font-mono">{i.confidence === null ? "N/D" : `${i.confidence}%`}</td><td className="px-2 font-mono">{i.frp === null ? "N/D" : `${i.frp} MW`}</td>
                  <td className="px-2 text-xs">{i.source}</td><td className="px-2"><StatusBadge s={i.status} /></td>
                </tr>))}</tbody>
            </table>
            {!rows.length && <p className="py-4 text-center text-sm text-muted-foreground">Sin detecciones que coincidan con los filtros.</p>}
          </div>
        </Panel>
        <Panel title="Resumen ejecutivo GAMC">
          <p className="text-sm text-muted-foreground">NASA reporta {all.length} detecciones térmicas en Cochabamba y Parque Tunari ({snapshot.eonetCount} eventos EONET abiertos, resto FIRMS VIIRS/MODIS de los últimos 2 días), con FRP acumulado de {frpTotal.toFixed(1)} MW monitoreando los 11 municipios del Tunari. Toda detección satelital requiere verificación en campo antes de movilización de cisternas.</p>
          {hash && <p className="mt-3 break-all font-mono text-[11px] text-success">SHA-256 auditoría municipal: {hash}</p>}
        </Panel>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, delta, tone }: { icon: typeof Flame; label: string; value: string; delta: string; tone: string }) {
  return (
    <Panel><div className="flex items-start justify-between"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div><Icon className={`h-5 w-5 ${tone}`} /></div>
      <div className={`mt-1 font-mono text-2xl font-bold ${tone}`}>{value}</div><div className="text-xs text-muted-foreground">{delta}</div></Panel>
  );
}
