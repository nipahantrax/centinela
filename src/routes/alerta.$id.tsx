import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  FileText,
  Flame,
  Mountain,
  Route as RouteIcon,
  Siren,
  Wind,
  ShieldCheck,
  Copy,
  Sparkles,
  Droplets,
  MapPin,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { MobileNav } from "@/components/centinela/MobileNav";
import { snapshotQuery, powerQuery } from "@/lib/nasa-queries";
import { useQuery } from "@tanstack/react-query";
import { fmtDate } from "@/lib/centinela-data";
import { departmentAt } from "@/lib/nasa-data";
import { nearestReference } from "@/lib/fire-operations";
import { classifyFrp } from "@/lib/fire-indices";
import { FieldChannel } from "@/components/centinela/FieldChannel";
import { TacButton } from "@/components/centinela/Brand";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/alerta/$id")({
  loader: async ({ params, context }) => {
    const snapshot = await context.queryClient.ensureQueryData(snapshotQuery);
    const inc = snapshot.incidents.find((i) => i.id === params.id);
    if (!inc) throw notFound();
    await context.queryClient.ensureQueryData(powerQuery(inc.lat, inc.lng));
    return inc;
  },
  head: ({ params }) => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: `CENTINELA · Alerta Táctica ${params.id}` },
      {
        name: "description",
        content:
          "Detalle de detección satelital NASA en Bolivia: coordenadas, fecha, clima diario y contacto de emergencia.",
      },
      { property: "og:title", content: `CENTINELA · Alerta Táctica ${params.id}` },
      {
        property: "og:description",
        content: "Detección satelital térmica en Bolivia para intervención de brigadas.",
      },
    ],
  }),
  component: Alert,
});

function Alert() {
  const inc = Route.useLoaderData();
  const power = useQuery(powerQuery(inc.lat, inc.lng));
  const [channel, setChannel] = useState(false);
  const ok = inc.route.state === "Ruta Habilitada";
  const frpInfo = classifyFrp(inc.frp);
  const isHarmonized = inc.source === "MODIS+VIIRS armonizado";
  const community = nearestReference(inc.lat, inc.lng, "comunidad");
  const protectedArea = nearestReference(inc.lat, inc.lng, "área");

  const copyDispatch = () => {
    const text =
      `CENTINELA ICS-209 · REPORTE TÁCTICO DE INCIDENTE\n` +
      `Foco: ${inc.id}\n` +
      `Zona: ${inc.zone}\n` +
      `Coordenadas: ${inc.lat.toFixed(5)}, ${inc.lng.toFixed(5)}\n` +
      `Google Maps: https://www.google.com/maps?q=${inc.lat.toFixed(5)},${inc.lng.toFixed(5)}\n` +
      `Intensidad (FRP): ${inc.frp ?? "N/D"} MW (${frpInfo.category})\n` +
      `Confianza Satelital: ${inc.confidence ?? "N/D"}% (${inc.source})\n` +
      `Comunidad más próxima: ${community?.name ?? "N/D"} (${community ? community.km.toFixed(1) : "?"} km)\n` +
      `Agua táctica estimada: ~${frpInfo.recommendedWaterLiters} L\n` +
      `Recomendación: ${frpInfo.tacticalAdvice}\n` +
      `Fecha observación: ${fmtDate(inc.date)}`;
    void navigator.clipboard.writeText(text);
    toast.success("Ficha táctica ICS-209 copiada al portapapeles");
  };

  const dispatchWhatsApp = () => {
    const msg = `🚨 *CENTINELA · DESPACHO TÁCTICO DE BRIGADA*\n\n🔥 *Foco:* ${inc.id}\n📍 *Zona:* ${inc.zone}\n🗺️ *Coordenadas:* ${inc.lat.toFixed(5)}, ${inc.lng.toFixed(5)}\n⚡ *Intensidad (FRP):* ${inc.frp ?? 'N/D'} MW (${frpInfo?.category ?? 'N/D'})\n🛰️ *Fuente:* ${inc.source}\n💧 *Agua táctica:* ~${frpInfo?.recommendedWaterLiters ?? 3000} L\n🚒 *Punto de agua:* ${inc.hydrant.name} (${inc.hydrant.distKm ?? 'N/D'} km)\n🛣️ *Acceso:* ${inc.route.state}\n\n_Enviado desde Terminal Táctico Orbital CENTINELA_`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-24 bg-[#060913] hud-bg text-slate-100 font-sans selection:bg-cyan-500/30">
      <header className="flex items-center gap-3 py-4">
        <Link
          to="/movil"
          aria-label="Volver"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 transition-colors hover:border-cyan-400 hover:text-cyan-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-1.5 font-mono text-base font-black tracking-[0.25em] text-white">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span>DETECCIÓN TÁCTICA</span>
        </div>
        <Link
          to="/dashboard"
          className="ml-auto font-mono text-[10px] uppercase text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Mando HUD →
        </Link>
      </header>

      {/* Tarjeta de Anomalía Térmica */}
      <section
        className={`glass rounded-2xl p-4 animate-in fade-in ${
          isHarmonized
            ? "border-cyan-400/50 shadow-[0_0_24px_rgba(0,229,255,0.25)]"
            : "border-red-500/40 shadow-[0_0_24px_rgba(255,51,75,0.25)]"
        }`}
      >
        <div className="flex gap-3.5">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
              isHarmonized
                ? "border-cyan-400/40 bg-cyan-950/40 text-cyan-300"
                : "border-red-500/40 bg-red-950/40 text-red-400"
            }`}
          >
            <Flame className="h-6 w-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-mono text-base font-black uppercase text-white">
                {inc.zone.replace("Parque N. ", "Parque ")}
              </h2>
              {isHarmonized && <Sparkles className="h-4 w-4 text-cyan-300" />}
            </div>
            <p className="font-mono text-xs text-slate-400">
              {isHarmonized
                ? "Validación cruzada dual MODIS + VIIRS (95%+ certeza)"
                : "Detección satelital térmica pendiente de confirmación"}
            </p>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isHarmonized
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                  : "bg-red-500/20 text-red-300 border border-red-500/50"
              }`}
            >
              {isHarmonized ? "ARMONIZADO" : "POR VERIFICAR"}
            </span>
            <span className="text-[10px] text-slate-400">{inc.source}</span>
          </div>
          <span className="text-[10px] text-slate-400">{fmtDate(inc.date)}</span>
        </div>
      </section>

      {/* Telemetría y Coordenadas */}
      <section className="glass mt-3 rounded-2xl p-4 space-y-3 border border-cyan-500/20">
        <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-200">
            Telemetría Radiativa
          </span>
          <span className="font-mono text-xs font-black text-white">{inc.id}</span>
        </div>

        <dl className="grid grid-cols-2 gap-2.5 font-mono text-xs">
          <div>
            <dt className="text-[9px] uppercase tracking-wider text-slate-500">Coordenadas</dt>
            <dd className="font-bold text-slate-200">
              {inc.lat.toFixed(4)}°, {inc.lng.toFixed(4)}°
            </dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-wider text-slate-500">Intensidad FRP</dt>
            <dd className="font-black text-amber-400">{inc.frp ?? "N/D"} MW</dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-wider text-slate-500">Confianza</dt>
            <dd className="font-bold text-cyan-300">{inc.confidence ?? "N/D"}%</dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-wider text-slate-500">Categoría</dt>
            <dd className="font-bold text-slate-200">{frpInfo.category}</dd>
          </div>
        </dl>

        {/* Demanda Hídrica */}
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-2.5 font-mono text-xs">
          <div className="flex justify-between text-slate-300">
            <span className="text-[10px] uppercase">Agua táctica recomendada:</span>
            <span className="font-bold text-cyan-300">~{frpInfo.recommendedWaterLiters} L</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 leading-tight">
            {frpInfo.tacticalAdvice}
          </p>
        </div>

        {/* Logística Local */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-2.5 font-mono text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase">Punto de agua:</span>
            <span className="font-bold text-slate-200">
              {inc.hydrant.name} ({inc.hydrant.distKm ?? "N/D"} km)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase">Acceso:</span>
            <span
              className={`font-bold ${
                inc.route.state === "Ruta Habilitada"
                  ? "text-emerald-400"
                  : inc.route.state === "Ruta Restringida"
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {inc.route.state}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase">Comunidad próxima:</span>
            <span className="font-bold text-cyan-300">
              {community?.name ?? "N/D"} ({community ? community.km.toFixed(1) : "?"} km)
            </span>
          </div>
        </div>

        {/* Acciones Tácticas */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <TacButton tone="cyan" className="text-xs" onClick={dispatchWhatsApp}>
            <Send className="h-3.5 w-3.5" />
            <span>Despachar</span>
          </TacButton>
          <TacButton tone="primary" className="text-xs" onClick={copyDispatch}>
            <Copy className="h-3.5 w-3.5" />
            <span>Ficha ICS-209</span>
          </TacButton>
        </div>
      </section>

      <MobileNav />
    </div>
  );
}
