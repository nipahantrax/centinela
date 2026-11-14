import { Compass, Wind, AlertCircle } from "lucide-react";
import { calculateAngstromIndex, getWindCompassInfo } from "@/lib/fire-indices";

interface Props {
  temp: number | null | undefined;
  rh: number | null | undefined;
  windKmH: number | null | undefined;
  windDeg: number | null | undefined;
  dateStr?: string | null;
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

            {/* Aguja dinámica */}
            <div
              className="absolute h-16 w-1 rounded-full transition-transform duration-700 ease-out"
              style={{
                transform: `rotate(${compass.bearingFrom}deg)`,
                background: "linear-gradient(to top, rgba(239, 68, 68, 0.9) 50%, rgba(59, 130, 246, 0.5) 50%)",
              }}
            >
              {/* Flecha hacia donde sopla */}
              <div className="absolute -top-1 -left-1 h-3 w-3 rotate-45 border-t-2 border-l-2 border-destructive" />
            </div>

            {/* Núcleo */}
            <div className="z-10 flex h-7 w-7 items-center justify-center rounded-full border border-primary/50 bg-background font-mono text-[10px] font-bold text-primary">
              {compass.short}
            </div>
          </div>
          <span className="mt-1 font-mono text-[11px] font-bold text-foreground">
            {compass.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {windDeg}° · sopla a {compass.advanceToward}°
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
              <span style={{ color: angstrom.color }}>Ångström: {angstrom.index}</span>
              <span
                className="rounded px-1.5 py-0.5 text-[9px] uppercase font-bold"
                style={{ backgroundColor: `${angstrom.color}30`, color: angstrom.color }}
              >
                {angstrom.label}
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
              {angstrom.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
