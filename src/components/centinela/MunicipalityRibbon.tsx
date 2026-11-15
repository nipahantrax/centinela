import { useMemo } from "react";
import { Mountain, Droplets, Wind, ShieldAlert, Truck, ChevronRight, Flame } from "lucide-react";
import { TUNARI_REGIONS, MUNICIPALITIES } from "@/lib/nasa-data";
import { NODES, type Incident } from "@/lib/centinela-data";
import { useI18n } from "@/lib/i18n";

interface Props {
  selectedId: string;
  onSelect: (id: string) => void;
  incidents: Incident[];
  compact?: boolean;
}

export function MunicipalityRibbon({ selectedId, onSelect, incidents, compact = false }: Props) {
  const { t } = useI18n();
  // Conteo de incidentes por municipio
  const incidentCounts = useMemo(() => {
    const map = new Map<string, number>();
    incidents.forEach((inc) => {
      const zoneLower = inc.zone.toLowerCase();
      MUNICIPALITIES.forEach((m) => {
        const sName = m.shortName?.toLowerCase() ?? m.name.toLowerCase();
        if (zoneLower.includes(sName) || zoneLower.includes(m.id)) {
          map.set(m.id, (map.get(m.id) ?? 0) + 1);
        }
      });
    });
    return map;
  }, [incidents]);

  const activeNode = useMemo(() => {
    return NODES.find((n) => n.id === selectedId);
  }, [selectedId]);

  return (
    <div className="w-full space-y-2">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <Mountain className="h-4 w-4 text-primary shrink-0" />
          <span className="font-bold text-foreground">11 Municipios del Parque Nacional Tunari</span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">· Eje Metropolitano GAMC</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-primary">
            <Droplets className="h-3 w-3" /> {t("waterReservesTotal")}
          </span>
          <span className="inline-flex items-center gap-1 text-fire">
            <Flame className="h-3 w-3" /> {incidents.length} {t("activeHotspots")}
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable Pills Ribbon */}
      <div
        role="tablist"
        aria-label="Selector de Municipios de Cochabamba"
        className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent snap-x"
      >
        {TUNARI_REGIONS.map((reg) => {
          const isSelected = selectedId === reg.id || (selectedId === "Cochabamba" && reg.id === "all");
          const count = reg.id === "all" ? incidents.length : incidentCounts.get(reg.id) ?? 0;

          return (
            <button
              key={reg.id}
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelect(reg.id)}
              className={`snap-start shrink-0 flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground font-bold shadow-[0_0_15px_rgba(255,107,0,0.35)] border border-primary scale-[1.02]"
                  : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 border border-border/50"
              }`}
            >
              <span className="truncate max-w-[150px]">{reg.name}</span>
              {reg.badge && (
                <span
                  className={`rounded px-1.5 py-0.2 text-[10px] font-mono uppercase ${
                    isSelected
                      ? "bg-black/30 text-primary-foreground font-semibold"
                      : "bg-background/60 text-muted-foreground"
                  }`}
                >
                  {reg.badge}
                </span>
              )}
              {count > 0 && (
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                    isSelected ? "bg-black text-fire animate-pulse" : "bg-destructive/80 text-white"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Ficha Táctica Rápida del Municipio Activo (Cuando se selecciona un municipio específico) */}
      {activeNode && (
        <div className="rounded-lg border border-primary/30 bg-gradient-to-r from-primary/10 via-background/80 to-background p-2.5 font-mono text-xs flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-foreground flex items-center gap-1.5 text-sm">
              <ShieldAlert className="h-4 w-4 text-primary" /> {activeNode.name}
            </span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Truck className="h-3.5 w-3.5 text-primary" />
              <span>{t("cisternPoint")}:</span>
              <strong className="text-foreground">{activeNode.cisternPoint.name}</strong>
              <span className="text-primary font-bold">({activeNode.cisternPoint.capacityLiters.toLocaleString()} L)</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Wind className="h-3.5 w-3.5 text-primary" />
              <span>{t("wind")}:</span>
              <strong className="text-foreground">{activeNode.weather.wind} km/h {activeNode.weather.windDir}</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded bg-secondary/80 px-2 py-0.5 text-[11px] text-muted-foreground border border-border/40">
              {t("fuelModel")}: <strong className="text-foreground">{activeNode.botany.fuelModel}</strong>
            </span>
            <span className="rounded bg-primary/20 px-2 py-0.5 text-[11px] text-primary font-semibold border border-primary/40">
              {t("etaEngine")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
