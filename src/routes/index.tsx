import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, Map, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { TacButton } from '@/components/centinela/Brand';
import { LanguageSelector } from '@/components/centinela/LanguageSelector';
import { useI18n } from '@/lib/i18n';
import shield from "@/assets/shield.png";
import night from "@/assets/cbba-night.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Acceso Táctico Cochabamba" },
      { name: "description", content: "Centro de Mando Táctico B2G: Focos de calor NASA en tiempo real para Cochabamba y los 11 municipios del Parque Nacional Tunari." },
      { property: "og:title", content: "CENTINELA · Acceso Táctico Cochabamba" },
      { property: "og:description", content: "Monitoreo satelital y despacho operativo para los 11 municipios de Cochabamba y Parque Tunari." },
    ],
  }),
  component: Login,
});

function Login() {
  const { t } = useI18n();
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
  async function login(provider: 'google') {
    setBusy(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) toast.error('No se pudo iniciar sesión. Intenta nuevamente.');
    } catch { toast.error('No se pudo conectar. Revisa tu conexión e intenta nuevamente.'); }
    finally { setBusy(null); }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      {/* Selector de idioma flotante superior */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      <img src={night} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" width={1088} height={1920} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      <section className="relative w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center">
          <img src={shield} alt="Escudo CENTINELA" width={816} height={816} className="mx-auto h-36 w-36 drop-shadow-[0_0_30px_var(--fire)]" />
          <h1 className="mt-2 font-mono text-4xl font-bold tracking-[0.25em]">CENTINELA</h1>
          <p className="text-sm uppercase tracking-[0.3em] text-fire font-bold">{t("subtitle")}</p>
        </div>
        <div className="mt-4 text-center">
          <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs text-primary font-bold">
            GAMC · Parque Nacional Tunari
          </span>
          <p className="mt-2 text-xs text-muted-foreground font-mono">{t("subgamc")}</p>
        </div>
        <Link to="/movil" className="btn-gold mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg font-mono text-sm font-bold shadow-lg"><Map className="h-5 w-5" /> {t("openTunariMap")}</Link>
        <div className="mt-4 grid gap-3">
          <TacButton disabled={busy !== null} onClick={() => void login('google')} className="min-h-12"><LogIn className="h-5 w-5" />{busy === 'google' ? 'Conectando…' : t("loginWithGoogle")}</TacButton>
        </div>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />O<span className="h-px flex-1 bg-border" /></div>
        <Link to="/publico" className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-background/60 font-mono text-sm uppercase tracking-wider hover:border-primary hover:text-primary">
          <Users className="h-5 w-5" /> [ {t("navPublic")} ]
        </Link>
      </section>
    </main>
  );
}
