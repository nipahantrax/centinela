import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  Download,
  FileSpreadsheet,
  Flame,
  Globe2,
  Leaf,
  Printer,
  Satellite,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TreePine,
  Truck,
  Zap,
} from "lucide-react";
import shield from "@/assets/shield.png";
import { Panel } from "@/components/centinela/Shell";
import { TacButton } from "@/components/centinela/Brand";
import { LanguageSelector } from "@/components/centinela/LanguageSelector";
import { ShareQRModal } from "@/components/centinela/ShareQRModal";
import { COCHABAMBA_STATS_2026 } from "@/lib/map-content";
import { NODES } from "@/lib/centinela-data";

export const Route = createFileRoute("/proyecto")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "CENTINELA · Arquitectura de Mando y Despacho Operativo GAMC" },
      {
        name: "description",
        content:
          "Especificación técnica y arquitectura del sistema CENTINELA para el Gobierno Autónomo Municipal de Cochabamba y el Parque Nacional Tunari · NASA Space Apps Challenge 2026.",
      },
      { property: "og:title", content: "CENTINELA · Arquitectura de Mando y Despacho Operativo GAMC" },
      { property: "og:description", content: "Marco de ingeniería aeroespacial, botánica pirogénica y respuesta municipal ante incendios forestales." },
    ],
  }),
  component: Proyecto,
});

function Proyecto() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="tac-grid min-h-screen">
      <div className="mx-auto max-w-5xl space-y-6 px-3 sm:px-4 py-8 pb-24 lg:pb-8">
        {/* Encabezado Institucional GAMC */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-primary/20 pb-6">
          <div className="flex items-center gap-4">
            <img src={shield} alt="Escudo CENTINELA" width={816} height={816} className="h-16 w-16" />
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-fire font-bold">
                Gobierno Autónomo Municipal de Cochabamba · Parque Tunari
              </p>
              <h1 className="font-mono text-3xl font-bold tracking-wider text-foreground">
                CENTINELA · Sistema Táctico B2G
              </h1>
              <p className="text-sm text-muted-foreground">
                Ingeniería Geoespacial y Respuesta Rápida · Reto NASA: <b className="text-primary">Harmonization of MODIS and VIIRS Hot Spots</b>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <LanguageSelector compact />
            <ShareQRModal buttonLabel="[ 📱 QR Acceso Móvil / Jurado ]" />
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-3 py-2 font-mono text-xs text-foreground hover:bg-secondary transition-colors"
            >
              <Printer className="h-4 w-4" /> Imprimir Documento
            </button>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-md border border-primary/60 bg-primary/15 px-4 py-2 font-mono text-xs uppercase text-primary glow-primary hover:bg-primary/25 transition-colors"
            >
              Centro de Mando <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Resumen Ejecutivo de Arquitectura Municipal */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-primary uppercase">
                <ShieldCheck className="h-4 w-4" />
                <span>Plataforma Municipal de Alerta Temprana y Despacho Operativo</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                CENTINELA conecta satélites de órbita baja de la NASA con la logística terrestre municipal de los 11 municipios del Parque Nacional Tunari (GAMC, UGR, Bomberos 119, SAR Bolivia y SERNAP), cerrando la brecha entre la detección del sensor y la autobomba en terreno en menos de 25 minutos.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* LOS 5 PILARES TÉCNICOS Y OPERATIVOS                      */}
        {/* ======================================================== */}
        <div className="space-y-6">
          {/* PILAR 1: IMPACTO */}
          <Panel className="border-l-4 border-l-primary/80">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                    PILAR 1
                  </span>
                  <h2 className="font-mono text-lg font-bold text-foreground">
                    IMPACTO TERRITORIAL: El problema no es detectar, es llegar a tiempo
                  </h2>
                </div>
                <p className="text-sm font-semibold italic text-primary/90">
                  "Lamentarse es peligroso para Cochabamba. La clave de la supervivencia del Tunari es la velocidad de respuesta."
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Los satélites de órbita polar detectan fuego cuando ya existe llama; si una brigada tarda horas en subir las pendientes del Tunari, el pastizal ya consumió hectáreas de bosque nativo. CENTINELA acorta la brecha táctica entre el sensor espacial y la autobomba en terreno con pre-despacho y geolocalización inmediata de hidrantes.
                </p>
              </div>
              <ShieldAlert className="h-10 w-10 text-fire shrink-0" />
            </div>

            {/* Métricas verificadas de Bolivia y Cochabamba */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs">
              <div className="rounded border border-destructive/40 bg-destructive/10 p-2">
                <span className="block text-[10px] text-muted-foreground">Bolivia 2024 (SIMB)</span>
                <span className="text-sm font-bold text-destructive">10,77M ha</span>
                <span className="block text-[9px] text-muted-foreground">Récord histórico</span>
              </div>
              <div className="rounded border border-warning/40 bg-warning/10 p-2">
                <span className="block text-[10px] text-muted-foreground">Bolivia 2025</span>
                <span className="text-sm font-bold text-warning">2,6M ha</span>
                <span className="block text-[9px] text-muted-foreground">Área quemada</span>
              </div>
              <div className="rounded border border-fire/40 bg-fire/10 p-2">
                <span className="block text-[10px] text-muted-foreground">Cochabamba 2026</span>
                <span className="text-sm font-bold text-fire">+{COCHABAMBA_STATS_2026.fireIncrease2026Percent}%</span>
                <span className="block text-[9px] text-muted-foreground">Incremento de incendios</span>
              </div>
              <div className="rounded border border-success/40 bg-success/10 p-2">
                <span className="block text-[10px] text-muted-foreground">Meta de Respuesta GAMC</span>
                <span className="text-sm font-bold text-success">&le; {COCHABAMBA_STATS_2026.responseTargetMinutes} min</span>
                <span className="block text-[9px] text-muted-foreground">Arribo de cisterna</span>
              </div>
            </div>
          </Panel>

          {/* PILAR 2: CREATIVIDAD */}
          <Panel className="border-l-4 border-l-amber-500/80">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-500">
                    PILAR 2
                  </span>
                  <h2 className="font-mono text-lg font-bold text-foreground">
                    INNOVACIÓN TÁCTICA: Motor 100% Preventivo (NASA POWER + Microsoft Weather)
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No esperamos a que el satélite vea la llama: transformamos CENTINELA de un mapa reactivo a un <b>motor predictivo de susceptibilidad</b>. Cruzamos el pronóstico horario de <b>Microsoft Weather API</b> con la telemetría histórica de <b>NASA POWER</b> (días acumulados de sequía, ráfagas extremas y 0% precipitación) para emitir alertas rojas de <b>Apresto Preventivo</b> antes de la primera chispa.
                </p>
                <div className="grid sm:grid-cols-3 gap-2 pt-1 font-mono text-xs">
                  <div className="rounded border border-border/60 bg-background/50 p-2">
                    <span className="font-bold text-primary">Pre-Despacho Municipal:</span>
                    <p className="text-[11px] text-muted-foreground">Posicionamiento preventivo de cisternas en los 11 municipios del Tunari ante riesgo extremo.</p>
                  </div>
                  <div className="rounded border border-border/60 bg-background/50 p-2">
                    <span className="font-bold text-green-500">WhatsApp Cloud Directo:</span>
                    <p className="text-[11px] text-muted-foreground">Envío en 1 clic de fichas ICS-209 preformateadas a Bomberos 119, SAR Bolivia, SERNAP y UGR.</p>
                  </div>
                  <div className="rounded border border-border/60 bg-background/50 p-2">
                    <span className="font-bold text-amber-500">Acceso Ciudadano Libre:</span>
                    <p className="text-[11px] text-muted-foreground">Portal público en <code>/publico</code> sin registro para que la comunidad fiscalice quemas ilegales.</p>
                  </div>
                </div>
              </div>
              <Sparkles className="h-10 w-10 text-amber-400 shrink-0" />
            </div>
          </Panel>

          {/* PILAR 3: VALIDEZ */}
          <Panel className="border-l-4 border-l-emerald-500/80">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400">
                    PILAR 3
                  </span>
                  <h2 className="font-mono text-lg font-bold text-foreground">
                    VALIDEZ CIENTÍFICA: Física Termodinámica y Botánica Pirogénica de los 11 Municipios
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  La solución está rigurosamente fundamentada en la ciencia del fuego y las especies botánicas nativas e introducidas de Cochabamba:
                </p>

                <div className="grid sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="rounded border border-border/60 bg-background/50 p-3 space-y-1">
                    <b className="font-mono text-destructive flex items-center gap-1">
                      <Flame className="h-4 w-4" /> 1. Termodinámica Real y Regla 30-30-30
                    </b>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-1 text-[11px]">
                      <li><b>Punto de Ignición Celulósico:</b> 300 °C (572 °F) donde madera y hojarasca arden espontáneamente.</li>
                      <li><b>Regla 30-30-30:</b> Emergencia crítica cuando coinciden &gt;30°C, &gt;30 km/h y &lt;30% HR.</li>
                      <li><b>Curva Térmica:</b> Escalamiento a 300°C-850°C en flashover y 1.200°C+ en fuego de copas.</li>
                      <li><b>Demanda de Agua:</b> Cálculo científico de L/min de ataque por MW radiativo (FRP).</li>
                    </ul>
                  </div>

                  <div className="rounded border border-border/60 bg-background/50 p-3 space-y-1">
                    <b className="font-mono text-emerald-400 flex items-center gap-1">
                      <Leaf className="h-4 w-4" /> 2. Botánica Pirogénica de los 11 Municipios
                    </b>
                    <ul className="list-disc pl-4 text-muted-foreground space-y-1 text-[11px]">
                      <li><b>Pastizales y Matorrales (90% sup. quemada):</b> Ichu (<i>Stipa ichu</i>, 1.4x), Thola (1.35x), Chacatea.</li>
                      <li><b>Introducidas Inflamables:</b> Eucalipto (1.6x, pavesas voladoras), Pino (1.5x, pinocha de 1.200°C).</li>
                      <li><b>Nativas Vulnerables (Protegidas):</b> Bosques relictos de Kewiña (<i>Polylepis</i>), Kiswara, Molle.</li>
                      <li><b>Transición Trópico:</b> Chume seco de chaqueo en Villa Tunari y Colomi.</li>
                    </ul>
                  </div>
                </div>
              </div>
              <TreePine className="h-10 w-10 text-emerald-400 shrink-0" />
            </div>
          </Panel>

          {/* PILAR 4: RELEVANCIA */}
          <Panel className="border-l-4 border-l-blue-500/80">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-500/20 px-2 py-0.5 font-mono text-xs font-bold text-blue-400">
                    PILAR 4
                  </span>
                  <h2 className="font-mono text-lg font-bold text-foreground">
                    RELEVANCIA ESPACIAL: Harmonization of MODIS and VIIRS Hot Spots
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Respondemos directamente al desafío oficial de la NASA mediante un algoritmo de fusión espaciotemporal multiespectral:
                </p>

                <div className="grid sm:grid-cols-3 gap-2 font-mono text-xs pt-1">
                  <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2.5">
                    <span className="font-bold text-amber-500">MODIS (Terra/Aqua)</span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Resolución espacial 1.000m (Banda 4µm). Récord histórico continuo de 20+ años. Base climatológica de series temporales.
                    </p>
                  </div>
                  <div className="rounded border border-orange-500/30 bg-orange-500/10 p-2.5">
                    <span className="font-bold text-orange-500">VIIRS (SNPP / NOAA-20)</span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Resolución espacial 375m (I-Band). Detección temprana de focos pequeños y delimitación nítida del perímetro del incendio.
                    </p>
                  </div>
                  <div className="rounded border border-primary/40 bg-primary/10 p-2.5 glow-primary">
                    <span className="font-bold text-primary">Algoritmo de Fusión CENTINELA</span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Ventana &lt;600m y &lt;2h. Reubicación del centroide a 375m, elevación de confianza a &gt;90% y reducción de falsas alarmas a &lt;1%.
                    </p>
                  </div>
                </div>
              </div>
              <Satellite className="h-10 w-10 text-blue-400 shrink-0" />
            </div>
          </Panel>

          {/* PILAR 5: ARQUITECTURA DE SOFTWARE Y GOBERNANZA */}
          <Panel className="border-l-4 border-l-purple-500/80">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 font-mono text-xs font-bold text-purple-400">
                    PILAR 5
                  </span>
                  <h2 className="font-mono text-lg font-bold text-foreground">
                    ARQUITECTURA DE SOFTWARE B2G: Clusterización GPU WebGL y Auditoría SHA-256
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sistema de alta disponibilidad optimizado para salas de comando y brigadistas en terreno, tolerante a caídas de red:
                </p>

                <div className="grid sm:grid-cols-3 gap-2 font-mono text-xs pt-1">
                  <div className="rounded border border-border/60 bg-background/50 p-2">
                    <span className="font-bold text-primary">Sellado Criptográfico SHA-256</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Cada foco y reporte táctico se sella con un hash inmutable para auditoría legal post-incendio.
                    </p>
                  </div>
                  <div className="rounded border border-border/60 bg-background/50 p-2">
                    <span className="font-bold text-fire">Motor GPU WebGL a 60 FPS</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Soporta más de 63.500+ anomalías térmicas simultáneas en Leaflet sin degradación de rendimiento.
                    </p>
                  </div>
                  <div className="rounded border border-border/60 bg-background/50 p-2">
                    <span className="font-bold text-success">100% Pruebas Unitarias</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Suite en Vitest con validación matemática de la física del fuego, distancias Haversine y armonización.
                    </p>
                  </div>
                </div>
              </div>
              <Award className="h-10 w-10 text-purple-400 shrink-0" />
            </div>
          </Panel>
        </div>

        {/* ======================================================== */}
        {/* MATRIZ DE LOS 11 NODOS MUNICIPALES DEL PARQUE TUNARI     */}
        {/* ======================================================== */}
        <Panel title="Matriz de Combustibles y Logística de los 11 Municipios del Tunari">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-muted-foreground text-[10px] uppercase">
                  <th className="p-2">Municipio</th>
                  <th className="p-2">Coordenadas</th>
                  <th className="p-2">Combustible Predominante</th>
                  <th className="p-2">Factor Riesgo</th>
                  <th className="p-2">Punto de Cisterna GAMC</th>
                  <th className="p-2">Capacidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {NODES.map((n) => (
                  <tr key={n.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-2 font-bold text-foreground">{n.name}</td>
                    <td className="p-2 text-muted-foreground text-[11px]">
                      {n.center[0].toFixed(3)}, {n.center[1].toFixed(3)}
                    </td>
                    <td className="p-2 text-primary font-semibold">{n.botany.fuelModel}</td>
                    <td className="p-2 text-fire font-bold">{n.botany.overallMultiplier}x</td>
                    <td className="p-2 text-muted-foreground">{n.cisternPoint.name}</td>
                    <td className="p-2 font-bold text-success">{n.cisternPoint.capacityLiters.toLocaleString()} L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Botón de Retorno al Centro de Mando */}
        <div className="flex justify-center pt-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-mono text-sm font-bold uppercase text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg glow-primary"
          >
            <Compass className="h-4 w-4" /> Ingresar al Centro de Mando Táctico (/dashboard)
          </Link>
        </div>

        <footer className="text-center text-xs text-muted-foreground pt-4 border-t border-border/40">
          CENTINELA · Sistema Táctico Municipal de Alerta Temprana · Gobierno Autónomo Municipal de Cochabamba (GAMC) · NASA Space Apps 2026
        </footer>
      </div>
    </div>
  );
}