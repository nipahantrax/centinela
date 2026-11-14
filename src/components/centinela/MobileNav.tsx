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
    <nav className="glass fixed inset-x-0 bottom-0 z-[500] grid grid-cols-5 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]">
      {items.map((it) => {
        const active = pathname === it.to || (it.l === "Alertas" && pathname.startsWith("/alerta"));
        return (
          <Link key={it.l} to={it.to} params={it.params as never} className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] uppercase tracking-wider ${active ? "text-destructive" : "text-muted-foreground"}`}>
            <it.i className="h-5 w-5" />{it.l}
            {active && <span className="h-0.5 w-6 rounded bg-destructive glow-danger" />}
          </Link>
        );
      })}
      <button onClick={() => toast.info("Bomberos 119 · Policía 110 (verificados) · COE departamental: pendiente de verificación oficial")} className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground"><Phone className="h-5 w-5" />Contactos</button>
      <Link to="/dashboard" className="flex flex-col items-center gap-0.5 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground"><Menu className="h-5 w-5" />Más</Link>
    </nav>
  );
}
