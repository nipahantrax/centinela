import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Bell, Database, Info, Layers, LogOut, Map, Settings, Smartphone } from "lucide-react";
import { toast } from "sonner";

const items = [
  { label: "Mapa", icon: Map, to: "/dashboard" as const },
  { label: "Alertas", icon: Bell, to: "/reportes" as const },
  { label: "Datos", icon: Database, to: "/reportes" as const },
  { label: "Capas", icon: Layers, to: "/dashboard" as const, soon: true },
  { label: "Reportes", icon: BarChart3, to: "/reportes" as const },
  { label: "Configuración", icon: Settings, to: "/dashboard" as const, soon: true },
  { label: "Vista móvil", icon: Smartphone, to: "/movil" as const },
  { label: "Proyecto", icon: Info, to: "/proyecto" as const },
];

export function NavMenu({ horizontal = false }: { horizontal?: boolean }) {
  const { pathname } = useLocation();
  return (
    <nav className={horizontal ? "flex gap-1 overflow-x-auto" : "grid grid-cols-3 gap-1"}>
      {items.map((it) => {
        const active = !it.soon && pathname === it.to && (it.label === "Mapa" || it.label === "Reportes");
        return (
          <Link key={it.label} to={it.to}
            onClick={(e) => { if (it.soon) { e.preventDefault(); toast.info(`Módulo ${it.label} disponible desde el mapa táctico`); } }}
            className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[11px] uppercase tracking-wider transition-colors ${active ? "border-primary/60 bg-primary/15 text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"}`}>
            <it.icon className="h-4 w-4" /> {it.label}
          </Link>
        );
      })}
      <Link to="/" className="flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-destructive">
        <LogOut className="h-4 w-4" /> Salir
      </Link>
    </nav>
  );
}

export function Panel({ title, children, className = "", right }: { title?: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return (
    <section className={`glass rounded-lg p-4 ${className}`}>
      {title && (
        <header className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ s }: { s: "Activo" | "Monitoreo" | "Controlado" }) {
  const c = s === "Activo" ? "border-destructive/60 text-destructive bg-destructive/10" : s === "Monitoreo" ? "border-warning/60 text-warning bg-warning/10" : "border-success/60 text-success bg-success/10";
  return <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${c}`}>{s}</span>;
}
