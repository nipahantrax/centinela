import { useEffect, useRef, useState } from 'react';
import { Radio, Siren, Volume2, VolumeX, AlertTriangle, Clock } from 'lucide-react';
import { TacButton } from './Brand';
import { FieldChannel } from './FieldChannel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { attentionDetections, nearestReference, projectFire, type Horizon } from '@/lib/fire-operations';
import { formatDateTime } from '@/lib/format';
import { type Incident, type Node } from '@/lib/centinela-data';

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
}: {
  incidents: Incident[];
  selected: Incident | undefined;
  weather: Node['weather'] | null;
  weatherReal: boolean;
  weatherDate: string | null | undefined;
  regionId: string;
  horizon: Horizon | 0;
  onHorizon: (value: Horizon | 0) => void;
  snapshotSource: string;
  snapshotUpdated: string;
}) {
  const [armed, setArmed] = useState(false);
  const [channel, setChannel] = useState(false);
  const [soundError, setSoundError] = useState('');
  const audio = useRef<AudioContext | null>(null);
  const warned = useRef(false);
  const alerts = attentionDetections(incidents);
  const attention = alerts.length > 0;

  function tone() {
    const ctx = audio.current;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
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
      setSoundError('');
      setArmed(true);
      tone();
    } catch {
      setSoundError('El navegador requiere interacción para activar audio.');
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

  const community = selected ? nearestReference(selected.lat, selected.lng, 'comunidad') : null;
  const area = selected ? nearestReference(selected.lat, selected.lng, 'área') : null;
  const projection = selected && horizon && weather ? projectFire(selected.lat, selected.lng, weather, horizon) : null;

  return (
    <div className="space-y-2.5">
      {/* Alerta de Prioridad Alta */}
      {attention && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-red-500/50 bg-red-950/40 p-3 text-red-200 shadow-[0_0_20px_rgba(255,51,75,0.3)] backdrop-blur-md"
        >
          <Siren className="h-5 w-5 shrink-0 text-red-400 animate-bounce" />
          <div className="space-y-1">
            <b className="font-mono text-xs uppercase tracking-wider text-red-300">
              PRIORIDAD TÁCTICA · ALERTA POBLACIONAL
            </b>
            <p className="text-xs text-red-200">
              {alerts.length} foco(s) activo(s) a menos de 5 km de centros poblados:{' '}
              {alerts
                .map((a) => `${nearestReference(a.lat, a.lng, 'comunidad')?.name} (${formatDateTime(a.date)})`)
                .join('; ')}
              .
            </p>
            <p className="font-mono text-[10px] text-red-300/80">
              NASA {snapshotSource} · Sincronizado: {formatDateTime(snapshotUpdated)}
            </p>
          </div>
        </div>
      )}

      {/* Barra de Acciones Tácticas */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TacButton
            tone={armed ? 'success' : 'ghost'}
            aria-pressed={armed}
            onClick={() => void toggleSound()}
            className="text-xs"
          >
            {armed ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {armed ? 'Sirena Activa' : 'Habilitar Sirena'}
          </TacButton>

          <TacButton onClick={() => setChannel(true)} tone="cyan" className="text-xs">
            <Radio className="h-3.5 w-3.5 text-cyan-300" />
            Canal SOS / Campo
          </TacButton>
        </div>

        {/* Proyección Temporal de Escenarios */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-800/80 bg-slate-950/50 p-1">
          <span className="flex items-center gap-1 px-2 font-mono text-[9px] uppercase tracking-wider text-slate-400">
            <Clock className="h-3 w-3 text-cyan-400" />
            Proyección:
          </span>
          {([0, 1, 3, 6] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onHorizon(h)}
              className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-all duration-200 ${
                horizon === h
                  ? 'border border-cyan-400/60 bg-cyan-500/25 text-white shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {h ? `+${h}h` : 'Off'}
            </button>
          ))}
        </div>
      </div>

      {soundError && <p className="font-mono text-[11px] text-amber-400">{soundError}</p>}

      {horizon > 0 && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-2 font-mono text-xs text-cyan-200">
          <span className="font-bold">
            {projection ? `Envolvente de avance estimada: ${projection.km.toFixed(2)} km · ` : ''}
          </span>
          Viento {weatherReal ? `POWER diario (${weatherDate ?? ''})` : 'sin dato de viento'}. Vector de avance simulado hacia cuadrante a sotavento.
        </div>
      )}

      <Dialog open={channel} onOpenChange={setChannel}>
        <DialogContent className="max-h-[90vh] overflow-y-auto glass border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="font-mono text-cyan-300 tracking-wider">
              CENTINELA · Canal de Evidencia y Comunicación Táctica
            </DialogTitle>
          </DialogHeader>
          <FieldChannel regionId={regionId} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
