import { Compass, Wind, AlertCircle, Flame, Clock } from "lucide-react";
import { calculateAngstromIndex, getWindCompassInfo, evaluateRule30_30_30 } from "@/lib/fire-indices";

interface Props {
  temp: number | null | undefined;
  rh: number | null | undefined;
  windKmH: number | null | undefined;
  windDeg: number | null | undefined;
  dateStr?: string | null | undefined;
}

export function TacticalCompass({ temp, rh, windKmH, windDeg, dateStr }: Props) {
  if (temp == null || rh == null || windKmH == null || windDeg == null) {
    return (
      <div className="rounded-md border border-border bg-card/60 p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 font-mono text-warning">
          <AlertCircle className="h-4 w-4" /> Telemetría aerodinámica no disponible
        </p>
        <p className="mt-1">Esperando lectura NASA POWER para este cuadrante.</p>
      </div>
    );
  }

  const angstrom = calculateAngstromIndex(temp, rh);
  const compass = getWindCompassInfo(windDeg);
  const rule30 = evaluateRule30_30_30(temp, windKmH, rh);

  // Estimación heurística de avance a sotavento según velocidad del viento y sequedad
  const dryness = Math.max(0.2, (100 - rh) / 100);
  const advance1hKm = Math.round(Math.max(0.4, windKmH * 0.04 * dryness) * 10) / 10;
  const advance3hKm = Math.round(advance1hKm * 3.1 * 10) / 10;
  const advance6hKm = Math.round(advance1hKm * 6.5 * 10) / 10;

  return (
    <div className="space-y-3 rounded-lg border border-border/80 bg-card/70 p-3 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-primary">
          <Compass className="h-4 w-4 animate-spin-slow" />
          <span>Vector Táctico de Viento</span>
        </div>
        {dateStr && (
          <span className="font-mono text-[10px] text-muted-foreground">
            POWER: {dateStr}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 items-center">
        {/* Rosa de Viento Gráfica */}
        <div className="flex flex-col items-center justify-center p-1">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-background/80 shadow-inner">
            {/* Ejes cardinales */}
            <span className="absolute top-1 font-mono text-[9px] font-bold text-muted-foreground">N</span>
            <span className="absolute bottom-1 font-mono text-[9px] font-bold text-muted-foreground">S</span>
            <span className="absolute left-1.5 font-mono text-[9px] font-bold text-muted-foreground">O</span>
            <span className="absolute right-1.5 font-mono text-[9px] font-bold text-muted-foreground">E</span>

            {/* Aguja dinámica animada */}
            <div
              className="absolute h-16 w-1 rounded-full transition-transform duration-700 ease-out"
              style={{
                transform: `rotate(${compass.bearingFrom}deg)`,
                background: "linear-gradient(to top, rgba(239, 68, 68, 0.95) 50%, rgba(59, 130, 246, 0.5) 50%)",
              }}
            >
              {/* Flecha hacia donde sopla */}
              <div className="absolute -top-1 -left-1 h-3 w-3 rotate-45 border-t-2 border-l-2 border-destructive" />
            </div>

            {/* Núcleo con rumbo cardinal */}
            <div className="z-10 flex h-7 w-7 items-center justify-center rounded-full border border-primary/50 bg-background font-mono text-[10px] font-bold text-primary shadow">
              {compass.short}
            </div>
          </div>
          <span className="mt-1 font-mono text-[11px] font-bold text-foreground">
            {compass.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {windDeg}° · avanza a {compass.advanceToward}°
          </span>
        </div>

        {/* Métricas y Peligro */}
        <div className="space-y-2">
          <div className="rounded border border-border/60 bg-background/50 p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Velocidad:</span>
              <span className="font-mono font-bold text-primary">{windKmH} km/h</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">En nudos:</span>
              <span className="font-mono text-muted-foreground">
                {(windKmH * 0.539957).toFixed(1)} kn
              </span>
            </div>
          </div>

          {/* Índice Ångström */}
          <div
            className="rounded border p-2 text-xs"
            style={{
              borderColor: angstrom.color,
              backgroundColor: `${angstrom.color}15`,
            }}
          >
            <div className="flex items-center justify-between font-mono font-bold">
              <span>Ångström: {angstrom.index}</span>
              <span style={{ color: angstrom.color }}>{angstrom.label}</span>
            </div>
            <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
              {angstrom.description}
            </p>
          </div>
        </div>
      </div>

      {/* Vector de Propagación Heurística (1h, 3h, 6h) */}
      <div className="rounded border border-primary/20 bg-primary/5 p-2 text-xs">
        <div className="flex items-center justify-between pb-1 font-mono text-[10px] font-bold uppercase text-primary">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Vector Heurístico a Sotavento ({compass.advanceToward}°)
          </span>
          {rule30.active && (
            <span className="rounded bg-destructive px-1 py-0.2 text-[9px] text-white font-bold animate-pulse">
              30-30-30
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
          <div className="rounded bg-background/60 p-1 border border-border/40">
            <span className="block text-[9px] text-muted-foreground">1 hora</span>
            <span className="text-xs font-bold text-primary">~{advance1hKm} km</span>
          </div>
          <div className="rounded bg-background/60 p-1 border border-border/40">
            <span className="block text-[9px] text-muted-foreground">3 horas</span>
            <span className="text-xs font-bold text-fire">~{advance3hKm} km</span>
          </div>
          <div className="rounded bg-background/60 p-1 border border-border/40">
            <span className="block text-[9px] text-muted-foreground">6 horas</span>
            <span className="text-xs font-bold text-destructive">~{advance6hKm} km</span>
          </div>
        </div>
        <p className="mt-1.5 text-[9px] text-muted-foreground leading-tight">
          Calculado a partir de velocidad de viento ({windKmH} km/h), desecación ({Math.round(dryness * 100)}%) y fricción de combustible ligero.
        </p>
      </div>
    </div>
  );
}
