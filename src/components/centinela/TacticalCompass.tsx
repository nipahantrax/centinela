import { Compass, Wind, AlertCircle } from "lucide-react";
import { calculateAngstromIndex, getWindCompassInfo } from "@/lib/fire-indices";

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
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-xs text-slate-400 backdrop-blur-md">
        <p className="flex items-center gap-1.5 font-mono text-amber-400">
          <AlertCircle className="h-4 w-4" /> Telemetría aerodinámica no disponible
        </p>
        <p className="mt-1 text-[11px] text-slate-500">Esperando lectura NASA POWER para este cuadrante.</p>
      </div>
    );
  }

  const angstrom = calculateAngstromIndex(temp, rh);
  const compass = getWindCompassInfo(windDeg);

  return (
    <div className="glass space-y-3 rounded-2xl p-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
          <Compass className="h-3.5 w-3.5 text-cyan-400 animate-spin-slow" />
          <span>Vector Táctico de Viento</span>
        </div>
        {dateStr && (
          <span className="font-mono text-[9px] text-slate-400">
            {dateStr}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 items-center">
        {/* Rosa de Viento Sci-Fi Holográfica */}
        <div className="flex flex-col items-center justify-center p-1">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-cyan-400/30 bg-slate-950/70 shadow-[0_0_18px_rgba(0,229,255,0.15)]">
            {/* Outer radar tick ring */}
            <div className="absolute inset-1 rounded-full border border-dashed border-cyan-500/20" />
            
            {/* Ejes cardinales */}
            <span className="absolute top-1.5 font-mono text-[9px] font-bold text-cyan-300">N</span>
            <span className="absolute bottom-1.5 font-mono text-[9px] font-bold text-slate-500">S</span>
            <span className="absolute left-1.5 font-mono text-[9px] font-bold text-slate-500">O</span>
            <span className="absolute right-1.5 font-mono text-[9px] font-bold text-slate-500">E</span>

            {/* Aguja aerodinámica con vector de avance */}
            <div
              className="absolute h-16 w-1 rounded-full transition-transform duration-700 ease-out"
              style={{
                transform: `rotate(${compass.bearingFrom}deg)`,
                background: "linear-gradient(to top, rgba(255, 51, 75, 0.95) 50%, rgba(0, 229, 255, 0.5) 50%)",
                boxShadow: "0 0 10px rgba(255, 51, 75, 0.6)",
              }}
            >
              {/* Flecha hacia donde sopla */}
              <div className="absolute -top-1 -left-1 h-3 w-3 rotate-45 border-t-2 border-l-2 border-red-500 shadow-[0_0_8px_#ff334b]" />
            </div>

            {/* Núcleo Central */}
            <div className="z-10 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/60 bg-slate-900 font-mono text-[10px] font-black text-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.4)]">
              {compass.short}
            </div>
          </div>
          <span className="mt-1.5 font-mono text-[11px] font-bold text-white tracking-wider">
            {compass.label}
          </span>
          <span className="font-mono text-[9px] text-cyan-400">
            {windDeg}° · propaga hacia {compass.advanceToward}°
          </span>
        </div>

        {/* Métricas e Índice Ångström */}
        <div className="space-y-2">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-2 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[10px] uppercase">Velocidad:</span>
              <span className="font-bold text-cyan-300 text-sm">{windKmH} km/h</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
              <span>Equivalente:</span>
              <span>{(windKmH * 0.539957).toFixed(1)} nudos</span>
            </div>
          </div>

          {/* Índice Ångström */}
          <div
            className="rounded-xl border p-2 text-xs backdrop-blur-md"
            style={{
              borderColor: `${angstrom.color}40`,
              backgroundColor: `${angstrom.color}15`,
            }}
          >
            <div className="flex items-center justify-between font-mono font-bold">
              <span style={{ color: angstrom.color }}>Ångström: {angstrom.index}</span>
              <span
                className="rounded-full px-1.5 py-0.2 text-[9px] uppercase font-bold"
                style={{ backgroundColor: `${angstrom.color}30`, color: angstrom.color }}
              >
                {angstrom.label}
              </span>
            </div>
            <p className="mt-1 text-[9px] leading-tight text-slate-400">
              {angstrom.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
