import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, Camera, FileText, Flame, Mountain, Route as RouteIcon, Siren, Wind, ShieldCheck, Copy, Sparkles, Droplets, MapPin, Share2 } from "lucide-react";
import { toast } from "sonner";
import { MobileNav } from "@/components/centinela/MobileNav";
import { snapshotQuery, powerQuery } from "@/lib/nasa-queries";
import { useQuery } from "@tanstack/react-query";
import { fmtDate, INCIDENTS } from "@/lib/centinela-data";
import { departmentAt } from '@/lib/nasa-data';
import { nearestReference } from '@/lib/fire-operations';
import { classifyFrp } from '@/lib/fire-indices';
import { FieldChannel } from '@/components/centinela/FieldChannel';
import { TacButton } from '@/components/centinela/Brand';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LanguageSelector } from '@/components/centinela/LanguageSelector';
import { useI18n } from '@/lib/i18n';

export const Route = createFileRoute("/alerta/$id")({
  loader: async ({ params, context }) => {
    const snapshot = await context.queryClient.ensureQueryData(snapshotQuery);
    const inc = snapshot.incidents.find(i => i.id === params.id) ?? INCIDENTS.find(i => i.id === params.id);
    if (!inc) throw notFound();
    await context.queryClient.ensureQueryData(powerQuery(inc.lat, inc.lng));
    return inc;
  },
  head: ({ params }) => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: `CENTINELA · Alerta ${params.id}` },
      { name: "description", content: "Detalle de detección NASA en Bolivia: coordenadas, fecha, clima diario y contacto de emergencia." },
      { property: "og:title", content: `CENTINELA · Alerta ${params.id}` },
      { property: "og:description", content: "Detección satelital en Bolivia pendiente de verificación en campo." },
    ],
  }),
  component: Alert,
});

function Alert() {
  const inc = Route.useLoaderData();
  const power = useQuery(powerQuery(inc.lat, inc.lng));
  const { t } = useI18n();
  const [channel, setChannel] = useState(false);
  const ok = inc.route.state === "Ruta Habilitada";
  const frpInfo = classifyFrp(inc.frp);
  const isHarmonized = inc.source === "MODIS+VIIRS armonizado";
  const community = nearestReference(inc.lat, inc.lng, 'comunidad');
  const protectedArea = nearestReference(inc.lat, inc.lng, 'área');

  const copyDispatch = () => {
    const text = `CENTINELA ICS-209 · REPORTE TÁCTICO DE INCIDENTE\n` +
      `Foco: ${inc.id}\n` +
      `Zona: ${inc.zone}\n` +
      `Coordenadas: ${inc.lat.toFixed(5)}, ${inc.lng.toFixed(5)}\n` +
      `Google Maps: https://www.google.com/maps?q=${inc.lat.toFixed(5)},${inc.lng.toFixed(5)}\n` +
      `Intensidad (FRP): ${inc.frp ?? 'N/D'} MW (${frpInfo.category})\n` +
      `Confianza Satelital: ${inc.confidence ?? 'N/D'}% (${inc.source})\n` +
      `Comunidad más próxima: ${community?.name ?? 'N/D'} (${community ? community.km.toFixed(1) : '?'} km)\n` +
      `Agua táctica estimada: ~${frpInfo.recommendedWaterLiters} L\n` +
      `Recomendación: ${frpInfo.tacticalAdvice}\n` +
      `Fecha observación: ${fmtDate(inc.date)}`;
    void navigator.clipboard.writeText(text);
    toast.success("Ficha táctica ICS-209 copiada");
  };

  const openWhatsApp = () => {
    const text = `🚨 *CENTINELA · DESPACHO TÁCTICO ICS-209*\n\n*Incidente:* ${inc.id}\n*Zona:* ${inc.zone}\n*Coordenadas:* ${inc.lat.toFixed(5)}, ${inc.lng.toFixed(5)}\n*Ubicación GPS:* https://www.google.com/maps?q=${inc.lat.toFixed(5)},${inc.lng.toFixed(5)}\n*Intensidad (FRP):* ${inc.frp ?? 'N/D'} MW (${frpInfo.category})\n*Confianza Satelital:* ${inc.confidence ?? 'N/D'}% (${inc.source})\n*Punto de Agua / Hidrante:* ${inc.hydrant?.name ?? 'Cisterna GAMC'} (${inc.hydrant?.distKm ?? 'N/D'} km)\n*Demanda Hídrica:* ~${frpInfo.recommendedWaterLiters} Litros\n*Combustible Vegetal:* ${inc.botany?.fuelModel ?? 'Pastizal / Ichu seco 90%'}\n*Recomendación:* ${frpInfo.tacticalAdvice}\n\n_Despachado vía CENTINELA · NASA Space Apps 2026_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md md:max-w-2xl lg:max-w-3xl px-4 pb-24">
      <header className="flex items-center gap-3 py-4">
        <Link to="/movil" aria-label={t("back")} className="rounded-md p-1 hover:text-primary"><ArrowLeft className="h-6 w-6" /></Link>
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h1 className="font-mono text-lg font-bold tracking-[0.3em]">{t("navAlerts")}</h1>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector />
          <Link to="/dashboard" className="hidden sm:inline font-mono text-[10px] uppercase text-primary hover:underline">{t("navDashboard")} →</Link>
        </div>
      </header>

      <section className={`glass rounded-xl p-4 animate-in fade-in ${isHarmonized ? 'border-primary/60 glow-primary' : 'border-destructive/50 glow-danger'}`}>
        <div className="flex gap-3">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${isHarmonized ? 'bg-primary/20' : 'bg-destructive/20'}`}>
            <Flame className={`h-7 w-7 ${isHarmonized ? 'text-primary' : 'text-fire'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold uppercase leading-tight">{inc.zone.replace("Parque N. ", "Parque ")}</h2>
              {isHarmonized && <Sparkles className="h-4 w-4 text-amber-400" />}
            </div>
            <p className="text-sm text-muted-foreground">
              {isHarmonized ? "Doble verificación satelital (MODIS + VIIRS)" : "Detección satelital pendiente de validación"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2">
          <div className="flex items-center gap-1.5">
            <span className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold ${isHarmonized ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-destructive/20 text-destructive border border-destructive/60'}`}>
              {isHarmonized ? "ARMONIZADO" : "POR VERIFICAR"}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">{inc.source}</span>
          </div>
          <span className="min-w-0 break-all font-mono text-xs text-muted-foreground">{fmtDate(inc.date)}</span>
        </div>
      </section>

      {/* Geometría y Telemetría Táctica */}
      <section className="glass mt-3 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-xs text-primary">
            <MapPin className="h-4 w-4" />
            <span>{inc.lat.toFixed(5)}, {inc.lng.toFixed(5)}</span>
          </div>
          <a
            href={`https://www.google.com/maps?q=${inc.lat.toFixed(5)},${inc.lng.toFixed(5)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded bg-primary/20 px-2 py-1 font-mono text-[10px] font-bold uppercase text-primary hover:bg-primary/30"
          >
            Abrir en Maps ↗
          </a>
        </div>

        {/* Severidad Térmica y Agua */}
        <div className="rounded-lg border border-border/80 bg-background/50 p-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Intensidad Térmica (FRP):</span>
            <b className="font-mono text-fire">{inc.frp ?? 'N/D'} MW · {frpInfo.category}</b>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Confianza NASA:</span>
            <b className="font-mono">{inc.confidence ?? 'N/D'}%</b>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Agua táctica recomendada:</span>
            <b className="font-mono text-primary">~{frpInfo.recommendedWaterLiters} Litros</b>
          </div>
          <p className="border-t border-border/40 pt-1.5 text-[11px] leading-tight text-muted-foreground">
            {frpInfo.tacticalAdvice}
          </p>
        </div>

        {/* Proximidad a Referencias */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-border/50 bg-background/40 p-2">
            <span className="block text-[10px] text-muted-foreground">Comunidad cercana:</span>
            <span className="font-semibold">{community?.name ?? 'N/D'}</span>
            <span className="block font-mono text-primary">{community ? `${community.km.toFixed(1)} km` : 'N/D'}</span>
          </div>
          <div className="rounded border border-border/50 bg-background/40 p-2">
            <span className="block text-[10px] text-muted-foreground">Área protegida:</span>
            <span className="font-semibold">{protectedArea?.name ?? 'N/D'}</span>
            <span className="block font-mono text-success">{protectedArea ? `${protectedArea.km.toFixed(1)} km` : 'N/D'}</span>
          </div>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <Card icon={Wind} title="Viento" value={power.data?.weather ? `${power.data.weather.wind} km/h` : "N/D"} sub={power.data?.weather ? `${power.data.weather.windDir} · POWER ${power.data.date}` : "NASA no disponible"} />
        <Card icon={Droplets} title="Punto Agua" value={inc.hydrant.distKm === null ? "Verificar" : `${inc.hydrant.distKm} km`} sub={inc.hydrant.name} />
        <Card icon={Mountain} title="Altitud zona" value={inc.altitude === null ? "N/D" : `${inc.altitude.toLocaleString("en-US")} m`} sub="Relieve no verificado" />
        <Card icon={ShieldCheck} title="Estado de acceso" value={inc.route.state.toUpperCase()} sub="Confirmar con brigada local" tone={ok ? "text-success" : "text-warning"} />
      </section>

      <div className="mt-4 space-y-2">
        <TacButton tone="primary" onClick={copyDispatch} className="w-full">
          <Copy className="h-4 w-4" /> [ {t("copyIcs209")} ]
        </TacButton>
        <button
          type="button"
          onClick={openWhatsApp}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-green-500/40 bg-green-500/15 py-2 font-mono text-xs font-bold text-green-400 hover:bg-green-500/25 transition-colors shadow-sm"
        >
          <Share2 className="h-4 w-4" /> [ {t("dispatchWhatsApp")} ]
        </button>
        <TacButton tone="danger" onClick={() => setChannel(true)} className="min-h-12 w-full">
          <Siren className="h-5 w-5" /> [ Contactar / registrar SOS ] →
        </TacButton>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <TacButton tone="ghost" onClick={() => toast.info("Adjuntos no habilitados. Puedes contactar por WhatsApp desde SOS.")} className="flex-col"><Camera className="h-5 w-5 text-primary" />Evidencia</TacButton>
        <TacButton tone="ghost" onClick={() => setChannel(true)} className="flex-col"><FileText className="h-5 w-5 text-primary" />Actualización</TacButton>
      </div>

      <Dialog open={channel} onOpenChange={setChannel}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Respuesta rápida · canal de campo</DialogTitle></DialogHeader><FieldChannel regionId={departmentAt(inc.lat,inc.lng)??'Cochabamba'}/></DialogContent></Dialog>
    </div>
  );
}

function Card({ icon: Icon, title, value, sub, tone = "text-foreground" }: { icon: typeof Wind; title: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><Icon className="h-4 w-4 text-primary" />{title}</div>
      <div className={`mt-1 font-mono text-lg font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
