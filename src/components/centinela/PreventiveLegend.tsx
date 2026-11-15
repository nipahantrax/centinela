import { useState } from "react";
import { ShieldCheck, Flame, Droplets, Wind, ChevronDown, ChevronUp, Sparkles, AlertTriangle, Eye, Layers } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type TacticalMapMode = "preventive" | "combat";

interface Props {
  mode: TacticalMapMode;
  onModeChange: (mode: TacticalMapMode) => void;
  className?: string;
  defaultExpanded?: boolean;
}

export function PreventiveLegend({ mode, onModeChange, className = "", defaultExpanded = false }: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`glass rounded-xl border border-primary/50 bg-slate-950/90 p-2.5 sm:p-3 shadow-2xl backdrop-blur-md transition-all duration-300 font-mono text-xs select-none max-w-[340px] sm:max-w-[390px] ${className}`}
    >
      {/* Cabecera Limpia sin recorte con texto completo: GUÍA RÁPIDA */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-foreground min-w-0">
          <Layers className="h-4 w-4 text-primary shrink-0" />
          <span className="uppercase tracking-wider text-[11px] font-bold text-foreground truncate">
            {t("legendTitle")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 rounded bg-secondary/80 hover:bg-secondary px-2.5 py-1 text-[10px] text-muted-foreground hover:text-foreground font-bold transition-colors cursor-pointer shrink-0 border border-border/40"
          title={expanded ? "Minimizar guía" : "Ver qué significan los colores del mapa"}
        >
          <span>{expanded ? (t("back") || "Ocultar") : "Desplegar"}</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Guía Rápida Desplegable: Jerarquía Visual de 4 Niveles */}
      {expanded && (
        <div className="mt-2.5 space-y-2 border-t border-border/50 pt-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="font-sans text-[11px] text-muted-foreground leading-tight">
            <b>{t("appName")}:</b> {t("appSubtitle")}
          </p>

          <div className="space-y-1.5">
            {/* Nivel 1 */}
            <div className="flex items-start gap-2 rounded bg-amber-500/10 border border-amber-500/30 p-1.5">
              <div className="h-3.5 w-3.5 rounded-full border border-amber-400 bg-amber-500/40 shrink-0 mt-0.5 animate-pulse" />
              <div className="leading-tight">
                <div className="text-[10px] font-bold text-amber-400">
                  {t("legendPrevTitle")}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {t("legendPrevDesc")}
                </div>
              </div>
            </div>

            {/* Nivel 2 */}
            <div className="flex items-start gap-2 rounded bg-orange-500/10 border border-orange-500/30 p-1.5">
              <div className="h-3 w-3 rounded-full bg-orange-500 shrink-0 mt-0.5 shadow-[0_0_8px_#f97316]" />
              <div className="leading-tight">
                <div className="text-[10px] font-bold text-orange-400">
                  {t("legendInitialTitle")}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {t("legendInitialDesc")}
                </div>
              </div>
            </div>

            {/* Nivel 3 */}
            <div className="flex items-start gap-2 rounded bg-destructive/10 border border-destructive/30 p-1.5">
              <div className="h-3.5 w-3.5 rounded-full bg-destructive shrink-0 mt-0.5 shadow-[0_0_10px_#ef4444]" />
              <div className="leading-tight">
                <div className="text-[10px] font-bold text-destructive flex items-center gap-1">
                  <span>{t("legendActiveTitle")}</span>
                  <Sparkles className="h-3 w-3 text-amber-400" />
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {t("legendActiveDesc")}
                </div>
              </div>
            </div>

            {/* Nivel 4 */}
            <div className="flex items-start gap-2 rounded bg-sky-500/10 border border-sky-500/30 p-1.5">
              <div className="h-3 w-3 rounded-full bg-sky-400 shrink-0 mt-0.5 shadow-[0_0_8px_#38bdf8]" />
              <div className="leading-tight">
                <div className="text-[10px] font-bold text-sky-400">
                  {t("legendWaterTitle")}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {t("legendWaterDesc")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
