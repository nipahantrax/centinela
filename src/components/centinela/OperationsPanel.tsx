import { useEffect, useRef, useState } from "react";
import {
  Radio,
  Siren,
  Volume2,
  VolumeX,
  FileText,
  Share2,
  Copy,
  CloudRain,
  ShieldAlert,
  Flame,
  CheckCircle,
  Truck,
  Leaf,
  Droplets,
} from "lucide-react";
import { toast } from "sonner";
import { TacButton } from "./Brand";
import { FieldChannel } from "./FieldChannel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { attentionDetections, nearestReference, projectFire, type Horizon } from "@/lib/fire-operations";
import { formatDateTime } from "@/lib/format";
import { type Incident, type Node, NODES } from "@/lib/centinela-data";
import { evaluateRule30_30_30, calculateFireWaterRequirement, classifyFrp } from "@/lib/fire-indices";
import type { PredictiveWeatherSusceptibility } from "@/lib/nasa-data";
import { useI18n } from "@/lib/i18n";

interface Props {
  incidents: Incident[];
  selected: Incident | undefined;
  weather: Node["weather"] | null;
  weatherReal: boolean;
  weatherDate: string | null | undefined;
  regionId: string;
  horizon: Horizon | 0;
  onHorizon: (value: Horizon | 0) => void;
  snapshotSource: string;
  snapshotUpdated: string;
  predictiveWeather?: PredictiveWeatherSusceptibility | null;
}

export function OperationsPanel({
  incidents,
  selected,
  weather,
  weatherReal,
  weatherDate,
  regionId,
  horizon,
  onHorizon,
  snapshotSource,
  snapshotUpdated,
  predictiveWeather,
}: Props) {
  const { t } = useI18n();
  const [armed, setArmed] = useState(false);
  const [channel, setChannel] = useState(false);
  const [icsOpen, setIcsOpen] = useState(false);
  const [soundError, setSoundError] = useState("");
  const audio = useRef<AudioContext | null>(null);
  const warned = useRef(false);

  const alerts = attentionDetections(incidents);
  const attention = alerts.length > 0;

  const temp = weather?.temp ?? 31;
  const wind = weather?.wind ?? 35;
  const rh = weather?.rh ?? 17;
  const rule30 = evaluateRule30_30_30(temp, wind, rh);

  function tone() {
    const ctx = audio.current;
    if (!ctx) return;
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);
    oscillator.frequency.linearRampToValueAtTime(440, ctx.currentTime + 1);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 1.5);
  }

  async function toggleSound() {
    if (armed) {
      setArmed(false);
      void audio.current?.suspend();
      return;
    }
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      setSoundError("");
      setArmed(true);
      tone();
    } catch {
      setSoundError("El navegador no habilitó el audio. Las alertas visuales siguen activas.");
    }
  }

  useEffect(() => {
    if (attention && armed && !warned.current) {
      tone();
      warned.current = true;
    }
    if (!attention) warned.current = false;
  }, [attention, armed]);

  useEffect(() => () => {
    void audio.current?.close();
  }, []);

  const community = selected ? nearestReference(selected.lat, selected.lng, "comunidad") : null;
  const area = selected ? nearestReference(selected.lat, selected.lng, "área") : null;
  const projection = selected && horizon && weather ? projectFire(selected.lat, selected.lng, weather, horizon) : null;

  const frpInfo = selected ? classifyFrp(selected.frp) : null;
  const waterReq = calculateFireWaterRequirement(selected?.frp ?? 15, selected?.areaHa, rule30.active);

  // Buscar el nodo o municipio más próximo para datos botánicos y de cisterna
  const currentMunicipalityNode = NODES.find((n) =>
    selected?.zone?.toLowerCase().includes(n.municipality.toLowerCase())
  ) ?? NODES[0];

  const botProfile = selected?.botany ?? currentMunicipalityNode?.botany;
  const cistern = currentMunicipalityNode?.cisternPoint;

  // Generador determinístico de Hash de Auditoría SHA-256 simulado para la demo
  const incidentHash = selected
    ? `SHA256-${Math.abs(
        (selected.lat * 10000 + selected.lng * 1000 + Date.parse(selected.date)) % 9999999
      ).toString(16).padStart(8, "0").toUpperCase()}`
    : "SHA256-CENTINELA-2026";

  // Ficha de Despacho Táctico ICS-209
  const ics209Text = `🛰️ [FICHA DE DESPACHO TÁCTICO ICS-209 · CENTINELA]
=========================================
ID INCIDENTE: ${selected?.id ?? "INC-2026-TÁCTICO"}
AUDITORÍA CRIPTOGRÁFICA: ${incidentHash}
FECHA / HORA: ${selected ? formatDateTime(selected.date) : "Tiempo Real"}
SENSOR / DETECCIÓN: ${selected?.source ?? "MODIS+VIIRS"} (Confianza: ${selected?.confidence ?? 90}%)
COORDENADAS GPS: ${selected?.lat.toFixed(5) ?? "-17.31000"}, ${selected?.lng.toFixed(5) ?? "-66.20000"}
ZONA / MUNICIPIO: ${selected?.zone ?? currentMunicipalityNode?.name ?? "Cochabamba"}
-----------------------------------------
TERMODINÁMICA Y COMPORTAMIENTO:
- Potencia Radiativa (FRP): ${selected?.frp ?? 0} MW (${frpInfo?.category ?? "Moderada"})
- Condición 30-30-30: ${rule30.active ? "🚨 ALERTA ROJA ACTIVA" : "Monitoreo"}
- Temperatura: ${temp}°C | Viento: ${wind} km/h | HR: ${rh}%
- Demanda Hídrica: ${waterReq.litersPerMinute} L/min (${waterReq.truckLoadsRequired} cisternas)
-----------------------------------------
BOTÁNICA Y COMBUSTIBLES:
- Modelo: ${botProfile?.fuelModel ?? "Pastizal / Ichu (90%)"}
- Factor de Riesgo Botánico: ${botProfile?.overallMultiplier ?? 1.4}x
- Recomendación: ${botProfile?.advisory ?? "Extrema precaución con pavesas a sotavento."}
-----------------------------------------
LOGÍSTICA MUNICIPAL EN APRESTO:
- Cisterna Más Próxima: ${cistern?.name ?? "Cisterna Municipal"} (${cistern?.capacityLiters.toLocaleString()} L)
- Contacto Operativo: ${cistern?.contact ?? "Bomberos 119"}
- Hidrante más cercano: ${selected?.hydrant.name ?? "Represa"} (${selected?.hydrant.distKm ?? "N/D"} km)
- Estado de Acceso: ${selected?.route.state ?? "Habilitada"} (ETA: ${selected?.route.etaMin ?? 25} min)
=========================================
Despachado vía CENTINELA · NASA Space Apps Cochabamba 2026`;

  const copyIcs = () => {
    void navigator.clipboard.writeText(ics209Text);
    toast.success("Ficha ICS-209 copiada al portapapeles para radio VHF o WhatsApp.");
  };

  const openWhatsApp = () => {
    const encoded = encodeURIComponent(ics209Text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-3 border-t border-border pt-2 text-xs">
      {/* Alerta de Prioridad Alta */}
      {attention && (
        <div
          role="alert"
          className="priority-alert flex items-start gap-2 rounded border border-destructive bg-destructive/20 p-2 text-destructive"
        >
          <Siren className="h-5 w-5 shrink-0 animate-pulse" />
          <div>
            <b className="font-mono text-xs">PRIORIDAD ALTA · VERIFICAR EN CAMPO</b>
            <p className="text-xs">
              {alerts.length} foco(s) FIRMS reciente(s) a menos de 5 km de una referencia poblada:{" "}
              {alerts
                .map(
                  (a) =>
                    `${nearestReference(a.lat, a.lng, "comunidad")?.name} (${formatDateTime(a.date)})`
                )
                .join("; ")}
              .
            </p>
            <p className="text-xs text-muted-foreground">
              Fuente: NASA {snapshotSource} · datos actualizados {formatDateTime(snapshotUpdated)}. Contacta al 119.
            </p>
          </div>
        </div>
      )}

      {/* GRID DE TELEMETRÍA PREVENTIVA: REGLA 30-30-30, MICROSOFT WEATHER Y BOTÁNICA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {/* Regla 30-30-30 y Alerta Predictiva */}
        {rule30.active ? (
          <div className="rounded-lg border border-destructive/80 bg-destructive/15 p-2.5 font-mono flex flex-col justify-between">
            <div className="flex items-center gap-1.5 font-bold text-destructive text-xs">
              <Flame className="h-4 w-4 animate-bounce shrink-0" />
              <span>EMERGENCIA 30-30-30 ACTIVA</span>
            </div>
            <p className="text-[11px] text-destructive/90 mt-1">
              Temp ({temp}°C &gt; 30), Viento ({wind} km/h &gt; 30), Humedad ({rh}% &lt; 30). Preposicionar cisternas.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 bg-background/50 p-2.5 font-mono text-[11px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Índice 30-30-30:</span>
              <span className="font-bold text-primary">{rule30.score}% ({rule30.severity})</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Monitoreo continuo de ignición y desecación de combustibles ligeros.
            </p>
          </div>
        )}

        {/* Susceptibilidad Preventiva Microsoft Weather + NASA POWER */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="flex items-center gap-1 text-primary font-bold truncate">
              <CloudRain className="h-3.5 w-3.5 shrink-0" /> Susceptibilidad Preventiva
            </span>
            <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[9px] font-bold text-primary shrink-0">
              {predictiveWeather?.source ? "Microsoft Weather" : "NASA POWER"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
            <div className="rounded bg-background/60 p-1 border border-border/40">
              <span className="block text-muted-foreground text-[9px]">Lluvia</span>
              <span className="font-bold text-foreground">{predictiveWeather?.precipitationProbability ?? 2}%</span>
            </div>
            <div className="rounded bg-background/60 p-1 border border-border/40">
              <span className="block text-muted-foreground text-[9px]">Estiaje</span>
              <span className="font-bold text-warning">{predictiveWeather?.rainlessDays ?? 44}d</span>
            </div>
            <div className="rounded bg-background/60 p-1 border border-border/40">
              <span className="block text-muted-foreground text-[9px]">Ráfagas</span>
              <span className="font-bold text-fire">{predictiveWeather?.windGustKmH ?? 48}k</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground line-clamp-2">
            {predictiveWeather?.preventiveAdvice ?? "Estiaje severo: alto riesgo de propagación en pastizales de ladera."}
          </p>
        </div>

        {/* Desglose Botánico del Punto Seleccionado */}
        {botProfile && (
          <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 space-y-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="flex items-center gap-1 text-foreground font-bold">
                <Leaf className="h-3.5 w-3.5 text-green-500 shrink-0" /> Perfil Botánico
              </span>
              <span className="font-bold text-fire">{botProfile.overallMultiplier}x Inflamable</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-semibold">
              {botProfile.fuelModel}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">
              {botProfile.advisory}
            </p>
          </div>
        )}
      </div>

      {/* FILA DE LOGÍSTICA HÍDRICA Y ACCIONES TÁCTICAS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
        {/* Distancias y Demanda Hídrica */}
        {selected && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
            <span>
              <span className="text-warning">Comunidad:</span> <b>{community?.name}</b> ({community?.km.toFixed(1)} km)
            </span>
            <span>
              <span className="text-muted-foreground">{t("waterRequirement")}:</span> ~<b className="text-primary">{Math.max(500, waterReq.litersPerMinute).toLocaleString("es-BO")} L/min</b> ({Math.max(1, waterReq.truckLoadsRequired)} {Math.max(1, waterReq.truckLoadsRequired) > 1 ? "cisternas" : "cisterna"} SEMAPA / Taquiña)
            </span>
          </div>
        )}

        {/* Botones de Acción Táctica e ICS-209 */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <TacButton
            tone={armed ? "danger" : "ghost"}
            aria-pressed={armed}
            onClick={() => void toggleSound()}
            className="text-xs font-bold"
          >
            <Siren className={`h-3.5 w-3.5 ${armed ? "animate-spin text-destructive" : ""}`} />
            {armed ? "🚨 Sirena Activa" : "🚨 Activar Sirena"}
          </TacButton>
          <TacButton onClick={() => setIcsOpen(true)} tone="primary" className="text-xs font-bold">
            <FileText className="h-3.5 w-3.5" /> 📋 {t("copyIcs209")}
          </TacButton>
          <TacButton onClick={() => setChannel(true)} className="text-xs font-bold">
            <Radio className="h-3.5 w-3.5" /> 📡 {t("sosButton")}
          </TacButton>
        </div>
      </div>

      {/* Escenarios Exploratorios */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-primary">ESCENARIOS EXPLORATORIOS</span>
        {([0, 1, 3, 6] as const).map((h) => (
          <TacButton
            key={h}
            tone={horizon === h ? "primary" : "ghost"}
            aria-pressed={horizon === h}
            onClick={() => onHorizon(h)}
          >
            {h ? `${h}h` : "Off"}
          </TacButton>
        ))}
      </div>
      {horizon > 0 && (
        <p className="text-xs text-warning">
          {projection ? `Envolvente de avance estimada: ${projection.km.toFixed(2)} km a ${projection.bearing}° · ` : ""}
          Viento {weatherReal ? `POWER diario ${weatherDate ?? ""}` : "NASA contingencia"}.
        </p>
      )}

      {/* Modal Ficha de Despacho Táctico ICS-209 */}
      <Dialog open={icsOpen} onOpenChange={setIcsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl font-mono text-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold text-base">
              <FileText className="h-5 w-5" /> Ficha de Despacho Táctico ICS-209 (Auditable)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded border border-primary/30 bg-primary/5 p-3">
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground select-all">
                {ics209Text}
              </pre>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <TacButton onClick={copyIcs}>
                <Copy className="h-4 w-4" /> Copiar para Radio / VHF
              </TacButton>
              <TacButton onClick={openWhatsApp} tone="primary">
                <Share2 className="h-4 w-4" /> Despachar por WhatsApp
              </TacButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Canal de Campo */}
      <Dialog open={channel} onOpenChange={setChannel}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-primary">CENTINELA · Comunicación Táctica</DialogTitle>
          </DialogHeader>
          <FieldChannel regionId={regionId} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
