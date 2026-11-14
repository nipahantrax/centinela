import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, Map, Users } from "lucide-react";
import { toast } from "sonner";
import { lovable } from '@/integrations/lovable';
import { supabase } from '@/integrations/supabase/client';
import { TacButton } from '@/components/centinela/Brand';
import shield from "@/assets/shield.png";
import night from "@/assets/cbba-night.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Acceso Táctico" },
      { name: "description", content: "Consulta los focos de calor reales de la NASA en toda Bolivia o inicia sesión para registrar reportes de campo." },
      { property: "og:title", content: "CENTINELA · Acceso Táctico" },
      { property: "og:description", content: "Mapa nacional de Bolivia, detecciones NASA y reportes de campo privados." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        void nav({ to: window.innerWidth < 1024 ? '/movil' : '/dashboard' });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [nav]);
  async function login(provider: 'google' | 'lovable') {
    setBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) toast.error('No se pudo iniciar sesión. Intenta nuevamente.');
    } catch { toast.error('No se pudo conectar. Revisa tu conexión e intenta nuevamente.'); }
    finally { setBusy(null); }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <img src={night} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" width={1088} height={1920} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      <section className="relative w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center">
          <img src={shield} alt="Escudo CENTINELA" width={816} height={816} className="mx-auto h-36 w-36 drop-shadow-[0_0_30px_var(--fire)]" />
          <h1 className="mt-2 font-mono text-4xl font-bold tracking-[0.25em]">CENTINELA</h1>
          <p className="text-sm uppercase tracking-[0.3em] text-fire">Alerta Temprana de Incendios</p>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">Toda Bolivia · 9 departamentos</p>
        <Link to="/movil" className="btn-gold mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg font-mono text-sm font-bold"><Map className="h-5 w-5" /> Abrir mapa de Bolivia</Link>
        <div className="mt-4 grid gap-3">
          <TacButton disabled={busy !== null} onClick={() => void login('google')} className="min-h-12"><LogIn className="h-5 w-5" />{busy === 'google' ? 'Conectando…' : 'Ingresar con Google'}</TacButton>
          <TacButton tone="ghost" disabled={busy !== null} onClick={() => void login('lovable')} className="min-h-12">{busy === 'lovable' ? 'Conectando…' : 'Ingresar con Lovable'}</TacButton>
        </div>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />O<span className="h-px flex-1 bg-border" /></div>
        <Link to="/publico" className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-background/60 font-mono text-sm uppercase tracking-wider hover:border-primary hover:text-primary">
          <Users className="h-5 w-5" /> [ Acceso Ciudadano Público ]
        </Link>
      </section>
    </main>
  );
}
