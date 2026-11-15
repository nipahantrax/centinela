import { riskLabel } from "@/lib/centinela-data";
import { AlertTriangle, Flame } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  value?: number | null;
  isRule30Active?: boolean;
}

export function RiskGauge({ value = 86, isRule30Active }: Props) {
  const { t } = useI18n();
  const safeValue = value != null && Number.isFinite(value) && value > 0 ? Math.round(value) : 86;
  const r = 52, c = 2 * Math.PI * r;
  const { tone } = riskLabel(safeValue);
  const color = isRule30Active ? "var(--destructive)" : `var(--${tone})`;
  const localizedLabel =
    safeValue >= 80
      ? t("riskHigh")
      : safeValue >= 40
      ? t("riskModerate")
      : t("riskLow");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - safeValue / 100)}
              style={{
                transition: "stroke-dashoffset 1s ease, stroke .5s",
                filter: `drop-shadow(0 0 8px ${color})`,
              }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center font-mono text-2xl font-bold">
            {safeValue}%
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("ignitionRiskTitle")}
          </div>
          <div className="text-xl font-bold flex items-center gap-1.5" style={{ color }}>
            {localizedLabel}
            {isRule30Active && <Flame className="h-5 w-5 animate-bounce text-destructive" />}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            35% {t("tempLabel")} · 35% {t("windLabel")} · 30% {t("humidityLabel")}
          </div>
        </div>
      </div>

      {isRule30Active && (
        <div className="flex items-center gap-2 rounded border border-destructive bg-destructive/20 px-2.5 py-1.5 font-mono text-xs font-bold text-destructive animate-pulse">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>[ {t("rule303030Active")} ]</span>
        </div>
      )}
    </div>
  );
}
