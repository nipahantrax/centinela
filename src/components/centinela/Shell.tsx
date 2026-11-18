import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Bell, Database, Info, Layers, LogOut, Map, Settings, Smartphone } from "lucide-react";
import { toast } from "sonner";
import React from "react";

const items = [
  { label: "Mando", icon: Map, to: "/dashboard" as const },
  { label: "Alertas", icon: Bell, to: "/reportes" as const },
  { label: "Telemetría", icon: Database, to: "/reportes" as const },
  { label: "Capas", icon: Layers, to: "/dashboard" as const, soon: true },
  { label: "Reportes", icon: BarChart3, to: "/reportes" as const },
  { label: "Ajustes", icon: Settings, to: "/dashboard" as const, soon: true },
  { label: "Terminal", icon: Smartphone, to: "/movil" as const },
  { label: "Dossier", icon: Info, to: "/proyecto" as const },
];

export function NavMenu({ horizontal = false }: { horizontal?: boolean }) {
  const { pathname } = useLocation();
  return (
    <nav className={horizontal ? "flex items-center gap-1.5 overflow-x-auto" : "grid grid-cols-4 gap-1.5"}>
      {items.map((it) => {
        const active = !it.soon && pathname === it.to && (it.label === "Mando" || it.label === "Reportes");
        return (
          <Link
            key={it.label}
            to={it.to}
            onClick={(e) => {
              if (it.soon) {
                e.preventDefault();
                toast.info(`Módulo [${it.label}] activo en el mapa táctico central`);
              }
            }}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md transition-all duration-200 ${
              active
                ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-200 shadow-[0_0_14px_rgba(0,229,255,0.25)]"
                : "border-slate-800/60 bg-slate-900/40 text-slate-400 hover:border-cyan-500/30 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <it.icon className={`h-3.5 w-3.5 ${active ? "text-cyan-300" : "text-slate-400"}`} />
            <span>{it.label}</span>
          </Link>
        );
      })}
      <Link
        to="/"
        className="flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-800/40 bg-slate-950/40 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:border-red-500/30 hover:text-red-400"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span>Salir</span>
      </Link>
    </nav>
  );
}

export function Panel({
  title,
  children,
  className = "",
  right,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <section className={`glass rounded-2xl p-4 transition-all duration-300 ${className}`}>
      {title && (
        <header className="mb-3 flex items-center justify-between border-b border-cyan-500/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200">
              {title}
            </h2>
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ s }: { s: "Activo" | "Monitoreo" | "Controlado" }) {
  const styles =
    s === "Activo"
      ? "border-red-500/50 text-red-300 bg-red-950/40 shadow-[0_0_12px_rgba(255,51,75,0.3)]"
      : s === "Monitoreo"
        ? "border-amber-500/50 text-amber-300 bg-amber-950/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
        : "border-emerald-500/50 text-emerald-300 bg-emerald-950/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]";

  const dot =
    s === "Activo"
      ? "bg-red-400 shadow-[0_0_8px_#ff334b]"
      : s === "Monitoreo"
        ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
        : "bg-emerald-400 shadow-[0_0_8px_#10b981]";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot} animate-pulse`} />
      {s}
    </span>
  );
}
