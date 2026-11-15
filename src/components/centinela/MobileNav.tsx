import { Link, useLocation } from "@tanstack/react-router";
import { Bell, FileBarChart, Map, LayoutDashboard, Award } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function MobileNav() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const items = [
    { l: t("navTactical"), i: LayoutDashboard, to: "/dashboard" as const },
    { l: t("navMobile"), i: Map, to: "/movil" as const },
    { l: t("navAlerts"), i: Bell, to: "/alerta/$id" as const, params: { id: "INC-2026-0712" } },
    { l: t("navReports"), i: FileBarChart, to: "/reportes" as const },
    { l: t("navProject"), i: Award, to: "/proyecto" as const },
  ];

  return (
    <nav
      aria-label="Navegación táctica móvil"
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-slate-950/95 backdrop-blur-md border-t border-slate-800 h-16 grid grid-cols-5 items-center px-2 pb-[env(safe-area-inset-bottom)] shadow-2xl lg:hidden"
    >
      {items.map((it) => {
        const active =
          pathname === it.to ||
          (it.to === "/alerta/$id" && pathname.startsWith("/alerta")) ||
          (it.to === "/proyecto" && pathname === "/proyecto") ||
          (it.to === "/reportes" && pathname === "/reportes") ||
          (it.to === "/movil" && pathname === "/movil") ||
          (it.to === "/dashboard" && pathname === "/dashboard");
        return (
          <Link
            key={it.l}
            to={it.to}
            params={("params" in it ? it.params : undefined) as never}
            className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 py-1 text-[9px] sm:text-[10px] uppercase tracking-wider transition-colors ${
              active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <it.i className={`h-4 w-4 sm:h-5 sm:w-5 ${active ? "text-primary drop-shadow-[0_0_6px_var(--primary)]" : ""}`} />
            <span className="truncate max-w-[64px] text-center">{it.l}</span>
            {active && <span className="h-0.5 w-6 rounded bg-primary glow-primary mt-0.5" />}
          </Link>
        );
      })}
    </nav>
  );
}
