import { riskLabel } from "@/lib/centinela-data";
import { Activity } from "lucide-react";

export function RiskGauge({ value }: { value: number }) {
  const r = 48;
  const c = 2 * Math.PI * r;
  const { label } = riskLabel(value);
  
  // Sci-fi tone styling
  const isCritical = value >= 75;
  const isModerate = value >= 40 && value < 75;
  
  const ringColor = isCritical ? "#ff334b" : isModerate ? "#f59e0b" : "#00e5ff";
  const glowShadow = isCritical
    ? "drop-shadow(0 0 10px rgba(255,51,75,0.7))"
    : isModerate
      ? "drop-shadow(0 0 8px rgba(245,158,11,0.6))"
      : "drop-shadow(0 0 8px rgba(0,229,255,0.6))";

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Sci-Fi Circular Radial Gauge with dual concentric rings */}
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          {/* Outer dashed decoration ring */}
          <circle
            cx="60"
            cy="60"
            r="55"
            fill="none"
            stroke="rgba(56, 189, 248, 0.15)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />
          {/* Inner background track */}
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="rgba(15, 23, 42, 0.8)"
            strokeWidth="8"
          />
          {/* Glowing active progress ring */}
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(Math.max(value, 0), 100) / 100)}
            style={{
              transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease",
              filter: glowShadow,
            }}
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-2xl font-black tracking-tight text-white" style={{ textShadow: `0 0 12px ${ringColor}` }}>
            {value}%
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
            ÍNDICE
          </span>
        </div>
      </div>

      {/* Telemetry Breakdown Details */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
          <Activity className="h-3 w-3 text-cyan-400 animate-pulse" />
          <span>Riesgo Ignición</span>
        </div>
        
        <div
          className="font-mono text-xl font-black uppercase tracking-wider"
          style={{ color: ringColor, textShadow: `0 0 14px ${ringColor}` }}
        >
          {label}
        </div>

        <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-1.5 font-mono text-[9px] text-slate-400">
          <div className="flex justify-between">
            <span>NASA POWER FWI:</span>
            <span className="text-cyan-300 font-bold">ALGORITMO 30-30-30</span>
          </div>
          <div className="mt-0.5 text-slate-500">
            Temp(35%) · Viento(30%) · Humedad(35%)
          </div>
        </div>
      </div>
    </div>
  );
}
