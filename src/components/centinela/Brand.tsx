import { Shield, Sparkles } from "lucide-react";
import React from "react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {/* Sci-Fi Hologram Badge */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-950/30 shadow-[0_0_16px_rgba(0,229,255,0.25)] backdrop-blur-md">
        <Shield className="h-5 w-5 text-cyan-400 animate-pulse" />
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
        </span>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-base font-extrabold tracking-[0.28em] text-white">CENTINELA</span>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-1.5 py-0.2 font-mono text-[9px] font-semibold tracking-wider text-cyan-300">
            HUD
          </span>
        </div>
        {!compact && (
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
            Mando Táctico Satelital · Cochabamba
          </div>
        )}
      </div>
    </div>
  );
}

export function TacButton({
  tone = "primary",
  className = "",
  children,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "danger" | "ghost" | "success" | "cyan";
}) {
  const tones = {
    primary:
      "border-cyan-400/35 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 hover:border-cyan-300/60 shadow-[0_0_18px_rgba(0,229,255,0.2)]",
    cyan:
      "border-cyan-400/50 bg-cyan-500/20 text-white hover:bg-cyan-500/30 hover:border-cyan-300 shadow-[0_0_22px_rgba(0,240,255,0.35)]",
    danger:
      "border-red-500/40 bg-red-500/20 text-red-200 hover:bg-red-500/30 hover:border-red-400/70 shadow-[0_0_20px_rgba(255,51,75,0.35)]",
    success:
      "border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 hover:border-emerald-400/70 shadow-[0_0_18px_rgba(16,185,129,0.3)]",
    ghost:
      "border-slate-700/50 bg-slate-900/40 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200 hover:bg-slate-800/60",
  };

  return (
    <button
      {...p}
      className={`relative inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider backdrop-blur-md transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}
