import { useState } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { REGIONS, departmentAt } from "@/lib/nasa-data";
import { formatDateTime } from "@/lib/format";
import type { useNasa } from "@/hooks/use-nasa";
import { TacButton } from "./Brand";
export function NasaControls({ nasa, compact = false }: { nasa: ReturnType<typeof useNasa>; compact?: boolean }) {
  const [lat, setLat] = useState(""); const [lng, setLng] = useState(""); const [error, setError] = useState("");
  const hasFrp = nasa.incidents.some(i => i.frp !== null);
  const frp = nasa.incidents.reduce((s,i) => s + (i.frp ?? 0), 0);
  return <div className={`space-y-2 ${compact ? "px-4 py-2" : ""}`}>
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Departamento" value={nasa.regionId} onChange={e => nasa.setRegion(e.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 font-mono text-xs">
        {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      <TacButton aria-label="Actualizar NASA" title="Actualizar NASA" onClick={() => void nasa.refresh()} disabled={nasa.syncing}><RefreshCw className={`h-4 w-4 ${nasa.syncing ? "animate-spin" : ""}`} /></TacButton>
    </div>
    <div className="flex flex-wrap gap-x-3 font-mono text-[10px] text-primary"><span>{nasa.incidents.length} detecciones · {nasa.snapshot.source}</span><span>FRP {hasFrp ? `${frp.toFixed(1)} MW` : "N/D"}</span><span>EONET Bolivia: {nasa.snapshot.eonetCount}</span></div>
    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Coordenadas / estado NASA</summary>
      <form className="mt-2 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); const a = Number(lat), b = Number(lng); if (!lat || !lng || !departmentAt(a,b)) { setError("Selecciona un punto dentro de Bolivia."); return; } setError(""); nasa.setRegion(departmentAt(a,b) ?? "all"); nasa.setPoint([a,b]); }}>
        <input aria-label="Latitud" type="number" step="any" placeholder="Latitud" value={lat} onChange={e => setLat(e.target.value)} className="w-24 rounded border border-input bg-background px-2 py-1" />
        <input aria-label="Longitud" type="number" step="any" placeholder="Longitud" value={lng} onChange={e => setLng(e.target.value)} className="w-24 rounded border border-input bg-background px-2 py-1" />
        <TacButton type="submit" aria-label="Consultar punto"><MapPin className="h-3 w-3" /></TacButton>
      </form>
      {error && <p role="alert" className="text-warning">{error}</p>}
      <p className="mt-1">Punto: {nasa.center[0].toFixed(4)}, {nasa.center[1].toFixed(4)} · consulta {formatDateTime(nasa.snapshot.updated)}</p>
      {nasa.snapshot.messages.map(m => <p key={m} className="mt-1">{m}</p>)}
      <p className="mt-1">POWER: promedio diario {nasa.weatherDate ?? "sin fecha"} (LST), no estación en tiempo real. Riesgo calculado por CENTINELA, no índice oficial NASA. Agua: OpenStreetMap, disponibilidad no verificada. Rutas: cálculo orientativo, sin tráfico ni cortes confirmados.</p>
    </details>
    {nasa.snapshot.source === "Sin datos" && <p role="status" className="text-[11px] text-warning">No hay detecciones disponibles en esta consulta. Revisa el estado de las fuentes; esto no descarta incendios.</p>}
    {!nasa.snapshot.firmsConfigured && <p className="text-[11px] text-warning">FIRMS sin clave · cobertura EONET limitada.</p>}
  </div>;
}