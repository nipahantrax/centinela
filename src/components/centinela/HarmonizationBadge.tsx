import { Satellite, ShieldCheck, Flame, Sparkles } from "lucide-react";
import type { HarmonizationStats } from "@/lib/harmonization";

interface Props {
  stats: HarmonizationStats | undefined;
  activeFilter: "all" | "harmonized" | "critical" | "near";
  onFilterChange: (filter: "all" | "harmonized" | "critical" | "near") => void;
}

export function HarmonizationBadge({ stats, activeFilter, onFilterChange }: Props) {
  if (!stats) return null;

  return (
    <div className="glass space-y-2.5 rounded-2xl p-3">
      {/* Encabezado del Reto NASA */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/10 pb-2">
        <div className="flex items-center gap-1.5">
          <Satellite className="h-4 w-4 text-cyan-400 animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-white">
            Armonización Satelital MODIS + VIIRS
          </span>
          <span className="rounded-full border border-cyan-400/40 bg-cyan-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
            NASA SPACE APPS
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Corroboración Dual: <b>{stats.corroborationRatePercent}%</b></span>
        </div>
      </div>

      {/* Métricas del Motor de Armonización */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-2">
          <span className="block text-[9px] uppercase tracking-wider text-slate-400">MODIS 1km</span>
          <span className="text-sm font-black text-amber-400">
            {stats.modisExclusiveCount + stats.dualConfirmedClusters}
          </span>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-2">
          <span className="block text-[9px] uppercase tracking-wider text-slate-400">VIIRS 375m</span>
          <span className="text-sm font-black text-orange-400">
            {stats.viirsExclusiveCount + stats.dualConfirmedClusters}
          </span>
        </div>
        <div className="rounded-xl border border-cyan-400/40 bg-cyan-950/30 p-2 shadow-[0_0_14px_rgba(0,229,255,0.2)]">
          <span className="block text-[9px] uppercase tracking-wider text-cyan-300 font-bold">Armonizados</span>
          <span className="text-sm font-black text-cyan-200">
            {stats.dualConfirmedClusters}
          </span>
        </div>
      </div>

      {/* Filtros Tácticos Rápidos en formato Sci-Fi Pills */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className={`flex-1 rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
            activeFilter === "all"
              ? "border border-cyan-400/60 bg-cyan-500/25 text-white shadow-[0_0_14px_rgba(0,229,255,0.3)]"
              : "border border-slate-800/80 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:text-slate-200"
          }`}
        >
          Todos ({stats.totalHarmonizedIncidents})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("harmonized")}
          className={`flex-1 rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${
            activeFilter === "harmonized"
              ? "border border-cyan-400/70 bg-cyan-500/30 text-white shadow-[0_0_16px_rgba(0,229,255,0.35)]"
              : "border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40"
          }`}
          title="Focos detectados simultáneamente por MODIS y VIIRS"
        >
          <Sparkles className="h-3 w-3 text-cyan-300" />
          Armonizados ({stats.dualConfirmedClusters})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("critical")}
          className={`flex-1 rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${
            activeFilter === "critical"
              ? "border border-red-500/70 bg-red-500/30 text-white shadow-[0_0_16px_rgba(255,51,75,0.4)]"
              : "border border-red-500/30 bg-red-950/30 text-red-300 hover:bg-red-900/40"
          }`}
          title="Focos de alta intensidad térmica FRP > 30 MW"
        >
          <Flame className="h-3 w-3 text-red-400" />
          FRP Crítico
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("near")}
          className={`flex-1 rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
            activeFilter === "near"
              ? "border border-amber-500/70 bg-amber-500/30 text-white shadow-[0_0_16px_rgba(245,158,11,0.4)]"
              : "border border-amber-500/30 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40"
          }`}
          title="Focos a menos de 5 km de centros poblados"
        >
          Poblados (&lt;5km)
        </button>
      </div>
    </div>
  );
}
