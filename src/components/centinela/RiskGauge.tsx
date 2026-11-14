import { riskLabel } from "@/lib/centinela-data";

export function RiskGauge({ value }: { value: number }) {
  const r = 52, c = 2 * Math.PI * r;
  const { label, tone } = riskLabel(value);
  const color = `var(--${tone})`;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="10" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
            style={{ transition: "stroke-dashoffset 1s ease, stroke .5s", filter: `drop-shadow(0 0 6px ${color})` }} />
        </svg>
        <div className="absolute inset-0 grid place-items-center font-mono text-2xl font-bold">{value}%</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Riesgo de ignición</div>
        <div className="text-2xl font-bold" style={{ color }}>{label}</div>
        <div className="font-mono text-[10px] text-muted-foreground">Temp·0.35 + Viento·0.30 + Sequedad·0.35</div>
      </div>
    </div>
  );
}
