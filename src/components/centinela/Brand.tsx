import { Flame } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-md border border-primary/40 bg-primary/10 glow-primary">
        <Flame className="h-5 w-5 text-fire" />
      </div>
      <div>
        <div className="font-mono text-lg font-bold tracking-[0.3em] text-primary">CENTINELA</div>
        {!compact && (
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Sistema activo · Monitoreo en tiempo real
          </div>
        )}
      </div>
    </div>
  );
}

export function TacButton({ tone = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "danger" | "ghost" | "success" }) {
  const tones = {
    primary: "border-primary/60 bg-primary/15 text-primary hover:bg-primary/25 glow-primary",
    danger: "border-destructive/70 bg-destructive/20 text-destructive hover:bg-destructive/30 glow-danger",
    success: "border-success/60 bg-success/15 text-success hover:bg-success/25",
    ghost: "border-border bg-secondary/40 text-foreground hover:border-primary/50 hover:text-primary",
  };
  return <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 ${tones[tone]} ${className}`} />;
}
