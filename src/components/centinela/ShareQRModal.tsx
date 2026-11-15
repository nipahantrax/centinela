import { useState, useId } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Copy, ExternalLink, Smartphone, Monitor, ShieldCheck, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ShareQRModalProps {
  triggerClassName?: string;
  buttonLabel?: string;
  defaultPath?: "/movil" | "/dashboard" | "/proyecto";
}

export function ShareQRModal({
  triggerClassName = "",
  buttonLabel = "[ 📱 QR Acceso Móvil / Jurado ]",
  defaultPath = "/movil",
}: ShareQRModalProps) {
  const [open, setOpen] = useState(false);
  const [activePath, setActivePath] = useState<"/movil" | "/dashboard" | "/proyecto">(defaultPath);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "https://centinelas-seven.vercel.app";

  const targetUrl = `${origin}${activePath}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      toast.success("Enlace copiado al portapapeles", {
        description: targetUrl,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 rounded-md border border-primary/50 bg-primary/15 px-2.5 py-1 font-mono text-xs font-bold text-primary shadow-sm hover:bg-primary/25 hover:border-primary/80 transition-all ${triggerClassName}`}
          title="Abrir Código QR para acceso rápido en celulares de jurados y brigadas"
        >
          <QrCode className="h-3.5 w-3.5" />
          <span>{buttonLabel}</span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-[#030712]/95 backdrop-blur-xl border border-primary/40 text-foreground font-mono shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <QrCode className="h-4 w-4" />
            <span>ACCESO RÁPIDO · JURADO NASA & BRIGADAS</span>
          </div>
          <DialogTitle className="text-base text-zinc-100 font-bold tracking-wide">
            Escanear Código QR en Celular
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-sans">
            Apunta la cámara de tu teléfono para acceder a la aplicación en vivo desplegada en Vercel.
          </p>
        </DialogHeader>

        {/* Selector de Ruta de Destino */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActivePath("/movil")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
              activePath === "/movil"
                ? "bg-primary/20 text-primary border-primary shadow-sm"
                : "bg-secondary/40 text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Móvil / Jurado</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePath("/dashboard")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
              activePath === "/dashboard"
                ? "bg-primary/20 text-primary border-primary shadow-sm"
                : "bg-secondary/40 text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span>Centro de Mando</span>
          </button>
        </div>

        {/* Contenedor del Código QR con fondo blanco de alto contraste */}
        <div className="flex flex-col items-center justify-center py-3">
          <div className="p-3 bg-white rounded-xl shadow-lg border-2 border-primary/40 flex items-center justify-center">
            <QRCodeSVG
              value={targetUrl}
              size={210}
              level="H"
              includeMargin={true}
              bgColor="#FFFFFF"
              fgColor="#030712"
            />
          </div>
          <p className="text-[11px] text-zinc-400 mt-2.5 truncate max-w-full px-2 text-center select-all">
            {targetUrl}
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-secondary/80 border border-border text-foreground hover:bg-secondary text-xs font-bold transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copiado!" : "Copiar Enlace"}</span>
          </button>

          <a
            href={targetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 text-xs font-bold transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Abrir en Pestaña</span>
          </a>
        </div>

        {/* Pie Informativo Institucional */}
        <div className="border-t border-border/40 pt-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="h-3 w-3" />
            Vercel Edge + Supabase Live
          </span>
          <span className="text-zinc-500">NASA Space Apps 2026</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
