import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, Map, Users, Shield, Orbit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TacButton } from "@/components/centinela/Brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Terminal de Acceso Orbital" },
      {
        name: "description",
        content:
          "Centro orbital de alerta temprana de incendios forestales para Bolivia con telemetría satelital NASA en tiempo real.",
      },
      { property: "og:title", content: "CENTINELA · Terminal de Acceso Orbital" },
      {
        property: "og:description",
        content: "Mapa nacional de Bolivia, telemetría NASA y despacho táctico.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        void nav({ to: window.innerWidth < 1024 ? "/movil" : "/dashboard" });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [nav]);

  async function login(provider: "google") {
    setBusy(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) toast.error("No se pudo iniciar sesión. Intenta nuevamente.");
    } catch {
      toast.error("No se pudo conectar. Revisa tu conexión e intenta nuevamente.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10 bg-[#060913] hud-bg text-slate-100 selection:bg-cyan-500/30">
      {/* Subtle orbital glow rings in background */}
      <div className="pointer-events-none absolute h-[600px] w-[600px] rounded-full border border-cyan-500/10 shadow-[0_0_120px_rgba(0,229,255,0.08)] animate-orbit" />
      <div className="pointer-events-none absolute h-[900px] w-[900px] rounded-full border border-dashed border-cyan-500/5" />

      <section className="glass relative w-full max-w-md rounded-3xl p-8 border border-cyan-500/25 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center">
          {/* Holographic Glowing Icon */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-cyan-400/40 bg-cyan-950/40 shadow-[0_0_35px_rgba(0,229,255,0.35)]">
            <Shield className="h-12 w-12 text-cyan-300 animate-pulse" />
          </div>

          <h1 className="mt-5 font-mono text-4xl font-black tracking-[0.28em] text-white">
            CENTINELA
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.3em] text-cyan-400">
            Orbital Wildfire HUD · Bolivia
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 font-mono text-[10px] text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
            NASA Space Apps Challenge · Cochabamba 2026
          </div>
        </div>

        {/* Primary Action Button */}
        <Link
          to="/dashboard"
          className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-400/60 bg-cyan-500/25 font-mono text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_24px_rgba(0,229,255,0.35)] transition-all hover:bg-cyan-500/35 active:scale-[0.98]"
        >
          <Map className="h-5 w-5 text-cyan-300" />
          <span>Abrir Centro de Mando Táctico</span>
        </Link>

        {/* OAuth Buttons */}
        <div className="mt-3.5 grid gap-2.5">
          <TacButton
            disabled={busy !== null}
            onClick={() => void login("google")}
            className="min-h-11 rounded-xl text-xs"
            tone="ghost"
          >
            <LogIn className="h-4 w-4 text-cyan-400" />
            <span>{busy === "google" ? "Conectando…" : "Ingresar con Google"}</span>
          </TacButton>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-800" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Acceso Alternativo</span>
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/movil"
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-800/80 bg-slate-950/60 font-mono text-xs uppercase tracking-wider text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
          >
            <Orbit className="h-4 w-4 text-cyan-400" />
            <span>Terminal Móvil</span>
          </Link>
          <Link
            to="/publico"
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-800/80 bg-slate-950/60 font-mono text-xs uppercase tracking-wider text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
          >
            <Users className="h-4 w-4 text-cyan-400" />
            <span>Acceso Ciudadano</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
