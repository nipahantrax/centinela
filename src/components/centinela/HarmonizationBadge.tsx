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
    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 backdrop-blur-md">
      {/* Encabezado del Reto NASA */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-1.5">
          <Satellite className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
            Armonización Satelital MODIS + VIIRS
          </span>
          <span className="rounded bg-primary/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-primary">
            RETO NASA
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          <span>Corroboración: <b>{stats.corroborationRatePercent}%</b></span>
        </div>
      </div>

      {/* Métricas del Motor de Armonización */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded border border-border/50 bg-background/50 p-1.5">
          <span className="block font-mono text-[10px] text-muted-foreground">MODIS 1km</span>
          <span className="font-mono text-xs font-bold text-amber-500">
            {stats.modisExclusiveCount + stats.dualConfirmedClusters}
          </span>
        </div>
        <div className="rounded border border-border/50 bg-background/50 p-1.5">
          <span className="block font-mono text-[10px] text-muted-foreground">VIIRS 375m</span>
          <span className="font-mono text-xs font-bold text-orange-500">
            {stats.viirsExclusiveCount + stats.dualConfirmedClusters}
          </span>
        </div>
        <div className="rounded border border-primary/40 bg-primary/10 p-1.5 glow-primary">
          <span className="block font-mono text-[10px] font-bold text-primary">Armonizados</span>
          <span className="font-mono text-xs font-bold text-primary">
            {stats.dualConfirmedClusters}
          </span>
        </div>
      </div>

      {/* Filtros Tácticos Rápidos */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => onFilterChange("all")}
          className={`flex-1 rounded px-2 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${
            activeFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-background/60 text-muted-foreground hover:bg-muted"
          }`}
        >
          Todos ({stats.totalHarmonizedIncidents})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("harmonized")}
          className={`flex-1 rounded px-2 py-1 font-mono text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1 ${
            activeFilter === "harmonized"
              ? "bg-primary text-primary-foreground"
              : "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          }`}
          title="Focos detectados simultáneamente por MODIS y VIIRS"
        >
          <Sparkles className="h-3 w-3" />
          Armonizados ({stats.dualConfirmedClusters})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("critical")}
          className={`flex-1 rounded px-2 py-1 font-mono text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1 ${
            activeFilter === "critical"
              ? "bg-destructive text-destructive-foreground"
              : "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
          }`}
          title="Focos de alta intensidad térmica FRP > 30 MW"
        >
          <Flame className="h-3 w-3" />
          FRP Crítico
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("near")}
          className={`flex-1 rounded px-2 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${
            activeFilter === "near"
              ? "bg-warning text-black"
              : "border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20"
          }`}
          title="Focos a menos de 5 km de centros poblados"
        >
          ⚠️ Poblados (&lt;5km)
        </button>
      </div>
    </div>
  );
}
