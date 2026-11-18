import { Link, useLocation } from "@tanstack/react-router";
import { Bell, FileBarChart, Map, Menu, Phone } from "lucide-react";
import { toast } from "sonner";

export function MobileNav() {
  const { pathname } = useLocation();
  const items = [
    { l: "Mapa", i: Map, to: "/movil" as const },
    { l: "Alertas", i: Bell, to: "/alerta/$id" as const, params: { id: "INC-2026-0712" } },
    { l: "Reportes", i: FileBarChart, to: "/reportes" as const },
  ];

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-[500] grid grid-cols-5 border-x-0 border-b-0 border-t border-cyan-500/20 bg-slate-950/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.7)]">
      {items.map((it) => {
        const active = pathname === it.to || (it.l === "Alertas" && pathname.startsWith("/alerta"));
        return (
          <Link
            key={it.l}
            to={it.to}
            params={it.params as never}
            className={`flex flex-col items-center justify-center gap-1 py-2 font-mono text-[9px] font-bold uppercase tracking-wider transition-all duration-200 ${
              active ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <it.i className={`h-4 w-4 ${active ? "text-cyan-300" : "text-slate-400"}`} />
            <span>{it.l}</span>
            {active && <span className="h-0.5 w-6 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff]" />}
          </Link>
        );
      })}
      <button
        onClick={() =>
          toast.info("Línea de Emergencia: Bomberos GAMC 119 · Policía 110 · Operación CENTINELA")
        }
        className="flex flex-col items-center justify-center gap-1 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200"
      >
        <Phone className="h-4 w-4" />
        <span>Emergencia</span>
      </button>
      <Link
        to="/dashboard"
        className="flex flex-col items-center justify-center gap-1 py-2 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-cyan-300"
      >
        <Menu className="h-4 w-4" />
        <span>Desktop</span>
      </Link>
    </nav>
  );
}
