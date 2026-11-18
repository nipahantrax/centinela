import React from "react";
import { Satellite, Radio, CheckCircle2, Shield, Activity } from "lucide-react";

interface Props {
  className?: string | undefined;
}

export function FleetWidget({ className = "" }: Props) {
  const satellites = [
    {
      name: "TERRA",
      agency: "NASA",
      sensor: "MODIS (36 bandas)",
      orbit: "705 km · Polar",
      status: "ACTIVO",
      coverage: "10:30 LT",
      color: "border-cyan-400 text-cyan-300",
      dot: "bg-cyan-400",
    },
    {
      name: "AQUA",
      agency: "NASA",
      sensor: "MODIS (Infrarrojo)",
      orbit: "705 km · Polar",
      status: "ACTIVO",
      coverage: "13:30 LT",
      color: "border-blue-400 text-blue-300",
      dot: "bg-blue-400",
    },
    {
      name: "SUOMI-NPP",
      agency: "NASA / NOAA",
      sensor: "VIIRS (375m I-Band)",
      orbit: "824 km · SSO",
      status: "ARMONIZADO",
      coverage: "01:30 / 13:30",
      color: "border-emerald-400 text-emerald-300",
      dot: "bg-emerald-400",
    },
    {
      name: "NOAA-20",
      agency: "NOAA / NASA",
      sensor: "VIIRS (Multiespectral)",
      orbit: "824 km · SSO",
      status: "ACTIVO",
      coverage: "Paso cruzado",
      color: "border-amber-400 text-amber-300",
      dot: "bg-amber-400",
    },
  ];

  return (
    <div
      className={`glass relative rounded-2xl border border-cyan-500/25 p-3.5 shadow-[0_0_25px_rgba(0,0,0,0.7)] flex flex-col justify-between ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Satellite className="h-4 w-4 text-cyan-300 animate-pulse" />
          <span className="font-mono text-xs font-black tracking-widest text-cyan-200 uppercase">
            ESTADO DE FLOTA · SATÉLITES NASA
          </span>
        </div>
        <span className="rounded-md border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
          4/4 EN ÓRBITA
        </span>
      </div>

      {/* Grid of 4 satellites */}
      <div className="my-2 grid grid-cols-2 gap-2 font-mono">
        {satellites.map((sat) => (
          <div
            key={sat.name}
            className="group rounded-xl border border-cyan-500/20 bg-slate-950/50 p-2.5 transition-all hover:border-cyan-400/50 hover:bg-slate-900/60"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black tracking-wider text-white">
                {sat.name}
              </span>
              <span className="flex items-center gap-1 text-[8px] text-cyan-400">
                <span className={`h-1.5 w-1.5 rounded-full ${sat.dot} animate-ping`} />
                {sat.status}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-300">
              {sat.sensor}
            </div>
            <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500">
              <span>{sat.orbit}</span>
              <span className="text-cyan-400/90">{sat.coverage}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Status */}
      <div className="flex items-center justify-between border-t border-cyan-500/20 pt-2 font-mono text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-cyan-400" />
          Latencia enlace L-Band: ~12s
        </span>
        <span className="text-cyan-300 font-bold">NASA LANCE FIRMS DIRECT</span>
      </div>
    </div>
  );
}
