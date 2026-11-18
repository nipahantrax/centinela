import React, { useEffect, useState } from "react";
import { type Incident } from "@/lib/centinela-data";
import { Radio, Crosshair, Sparkles } from "lucide-react";

interface Props {
  incidents: Incident[];
  selectedId?: string | undefined;
  onSelect?: ((id: string) => void) | undefined;
  className?: string | undefined;
}

export function RadarWidget({ incidents, selectedId, onSelect, className = "" }: Props) {
  const [sweepAngle, setSweepAngle] = useState(0);

  // 360-degree radar sweep animation loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      setSweepAngle((prev) => (prev + dt * 90) % 360);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Map incidents to polar coordinates relative to Cochabamba (-17.389, -66.156)
  const centerLat = -17.389;
  const centerLng = -66.156;

  const blips = incidents.slice(0, 8).map((inc, index) => {
    const dLat = (inc.lat - centerLat) * 111; // Approx km
    const dLng = (inc.lng - centerLng) * 111 * Math.cos((centerLat * Math.PI) / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    const angleRad = Math.atan2(dLat, dLng);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Scale distance to radar view (max radius ~ 42px in 100x100 box)
    const maxRadarKm = 30;
    const clampedDist = Math.min(dist, maxRadarKm);
    const rScaled = (clampedDist / maxRadarKm) * 38;

    const x = 50 + rScaled * Math.cos(angleRad);
    const y = 50 - rScaled * Math.sin(angleRad); // Invert Y for SVG

    const isSelected = inc.id === selectedId;
    const isHarmonized = inc.source === "MODIS+VIIRS armonizado";

    return {
      id: inc.id,
      x,
      y,
      distKm: dist.toFixed(1),
      zone: inc.zone,
      isSelected,
      isHarmonized,
      frp: inc.frp ?? 15,
      angleDeg: (angleDeg + 360) % 360,
    };
  });

  return (
    <div
      className={`glass relative rounded-2xl border border-cyan-500/25 p-3.5 shadow-[0_0_25px_rgba(0,0,0,0.7)] flex flex-col justify-between ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <span className="font-mono text-xs font-black tracking-widest text-cyan-200 uppercase">
            SYSTEM SCAN · RADAR LIVE
          </span>
        </div>
        <span className="rounded-md border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
          R-MAX: 30 KM
        </span>
      </div>

      {/* Main Circular Radar Graphic */}
      <div className="relative my-2 flex items-center justify-center">
        <div className="relative h-44 w-44">
          <svg viewBox="0 0 100 100" className="h-full w-full select-none">
            {/* Outer radar dashed border */}
            <circle
              cx="50"
              cy="50"
              r="47"
              fill="rgba(4, 14, 34, 0.75)"
              stroke="rgba(0, 229, 255, 0.4)"
              strokeWidth="0.8"
              strokeDasharray="2 2"
            />

            {/* Range rings (10km, 20km, 30km) */}
            <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="0.6" />
            <circle cx="50" cy="50" r="24" fill="none" stroke="rgba(0, 229, 255, 0.25)" strokeWidth="0.6" />
            <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(0, 229, 255, 0.3)" strokeWidth="0.6" />

            {/* Crosshairs */}
            <line x1="50" y1="3" x2="50" y2="97" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="0.5" />
            <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="0.5" />

            {/* Cardinal points */}
            <text x="50" y="8" textAnchor="middle" fill="#00e5ff" fontSize="3" fontFamily="monospace">N</text>
            <text x="94" y="51" textAnchor="middle" fill="#00e5ff" fontSize="3" fontFamily="monospace">E</text>
            <text x="50" y="96" textAnchor="middle" fill="#00e5ff" fontSize="3" fontFamily="monospace">S</text>
            <text x="6" y="51" textAnchor="middle" fill="#00e5ff" fontSize="3" fontFamily="monospace">W</text>

            {/* Rotating 60-degree radar sweep beam */}
            <defs>
              <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(0, 229, 255, 0.45)" />
                <stop offset="60%" stopColor="rgba(0, 229, 255, 0.1)" />
                <stop offset="100%" stopColor="rgba(0, 229, 255, 0)" />
              </linearGradient>
            </defs>
            <g transform={`rotate(${sweepAngle} 50 50)`}>
              <path
                d="M 50 50 L 50 4 A 46 46 0 0 1 90 27 Z"
                fill="url(#sweepGrad)"
              />
              <line x1="50" y1="50" x2="50" y2="3" stroke="#00f0ff" strokeWidth="0.8" />
            </g>

            {/* Target blips */}
            {blips.map((b) => (
              <g
                key={b.id}
                className="cursor-pointer transition-transform hover:scale-125"
                onClick={() => onSelect?.(b.id)}
              >
                {b.isSelected && (
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r="4.5"
                    fill="none"
                    stroke="#00e5ff"
                    strokeWidth="0.8"
                    className="animate-ping"
                  />
                )}
                <circle
                  cx={b.x}
                  cy={b.y}
                  r={b.isSelected ? "2.8" : "2"}
                  fill={b.isHarmonized ? "#00f0ff" : "#ff334b"}
                  stroke="#ffffff"
                  strokeWidth="0.4"
                  filter="drop-shadow(0 0 3px rgba(255,51,75,0.8))"
                />
              </g>
            ))}

            {/* Center radar origin point (Cochabamba) */}
            <circle cx="50" cy="50" r="1.5" fill="#10b981" />
          </svg>

          {/* Center Coordinates HUD text */}
          <div className="pointer-events-none absolute bottom-1 right-1 font-mono text-[8px] text-cyan-400/80">
            RADAR-01 · COCHABAMBA
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="flex items-center justify-between border-t border-cyan-500/20 pt-2 font-mono text-xs">
        <div className="flex items-center gap-1.5 text-cyan-300">
          <Crosshair className="h-3.5 w-3.5 text-red-400 animate-spin-slow" />
          <span className="font-bold text-white">{blips.length}</span>
          <span className="text-[10px] text-slate-400">SEÑALES EN RANGO</span>
        </div>
        <button
          onClick={() => {
            if (blips[0]) onSelect?.(blips[0].id);
          }}
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-200 transition-colors hover:bg-cyan-500/35"
        >
          ENFOCAR ↗
        </button>
      </div>
    </div>
  );
}
