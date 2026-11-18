import { useState } from "react";
import { MapPin, RefreshCw, Satellite } from "lucide-react";
import { REGIONS, departmentAt } from "@/lib/nasa-data";
import { formatDateTime } from "@/lib/format";
import type { useNasa } from "@/hooks/use-nasa";
import { TacButton } from "./Brand";

export function NasaControls({
  nasa,
  compact = false,
}: {
  nasa: ReturnType<typeof useNasa>;
  compact?: boolean;
}) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState("");
  const hasFrp = nasa.incidents.some((i) => i.frp !== null);
  const frp = nasa.incidents.reduce((s, i) => s + (i.frp ?? 0), 0);

  return (
    <div className={`space-y-2 font-mono ${compact ? "px-2 py-1" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <Satellite className="h-4 w-4 text-cyan-400 shrink-0" />
          <select
            aria-label="Departamento"
            value={nasa.regionId}
            onChange={(e) => nasa.setRegion(e.target.value)}
            className="h-9 w-full rounded-xl border border-cyan-500/30 bg-slate-900/80 px-2.5 text-xs text-cyan-200 outline-none transition-all hover:border-cyan-400 focus:border-cyan-300"
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id} className="bg-slate-950 text-white">
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <TacButton
          aria-label="Actualizar NASA"
          title="Actualizar telemetría NASA"
          onClick={() => void nasa.refresh()}
          disabled={nasa.syncing}
          tone="cyan"
          className="h-9 px-3"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${nasa.syncing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Sincronizar</span>
        </TacButton>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-cyan-300">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          {nasa.incidents.length} focos · {nasa.snapshot.source}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          FRP total: {hasFrp ? `${frp.toFixed(1)} MW` : "N/D"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          EONET Bolivia: {nasa.snapshot.eonetCount}
        </span>
      </div>

      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-cyan-400/80 hover:text-cyan-300">
          [+] Consultar coordenadas GPS específicas
        </summary>
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const a = Number(lat),
              b = Number(lng);
            if (!lat || !lng || !departmentAt(a, b)) {
              setError("Ingresa un punto dentro de las coordenadas de Bolivia.");
              return;
            }
            setError("");
            nasa.setRegion(departmentAt(a, b) ?? "all");
            nasa.setPoint([a, b]);
          }}
        >
          <input
            aria-label="Latitud"
            type="number"
            step="any"
            placeholder="Latitud"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-24 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-white"
          />
          <input
            aria-label="Longitud"
            type="number"
            step="any"
            placeholder="Longitud"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-24 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-white"
          />
          <TacButton type="submit" tone="primary" className="h-8 px-2">
            <MapPin className="h-3 w-3" />
          </TacButton>
        </form>
        {error && <p role="alert" className="mt-1 text-[11px] text-amber-400">{error}</p>}
        <p className="mt-1 text-[10px] text-slate-500">
          Sensor: {nasa.center[0].toFixed(4)}, {nasa.center[1].toFixed(4)} · Consulta: {formatDateTime(nasa.snapshot.updated)}
        </p>
      </details>
    </div>
  );
}
