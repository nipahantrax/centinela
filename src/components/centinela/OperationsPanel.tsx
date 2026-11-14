import { useEffect, useRef, useState } from 'react';
import { Radio, Siren, Volume2, VolumeX } from 'lucide-react';
import { TacButton } from './Brand';
import { FieldChannel } from './FieldChannel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { attentionDetections, nearestReference, projectFire, type Horizon } from '@/lib/fire-operations';
import { formatDateTime } from '@/lib/format';
import { type Incident, type Node } from '@/lib/centinela-data';

export function OperationsPanel({ incidents, selected, weather, weatherReal, weatherDate, regionId, horizon, onHorizon, snapshotSource, snapshotUpdated }: { incidents: Incident[]; selected: Incident | undefined; weather:Node['weather']|null; weatherReal:boolean; weatherDate:string|null|undefined; regionId:string; horizon:Horizon|0; onHorizon:(value:Horizon|0)=>void; snapshotSource:string; snapshotUpdated:string }) {
  const [armed,setArmed]=useState(false);
  const [channel,setChannel]=useState(false);
  const [soundError,setSoundError]=useState('');
  const audio=useRef<AudioContext|null>(null);
  const warned=useRef(false);
  const alerts=attentionDetections(incidents);
  const attention=alerts.length>0;
  function tone() {
    const ctx=audio.current;
    if (!ctx) return;
    const oscillator=ctx.createOscillator(), gain=ctx.createGain();
    oscillator.type='sine'; oscillator.frequency.setValueAtTime(440,ctx.currentTime); oscillator.frequency.linearRampToValueAtTime(880,ctx.currentTime+0.5); oscillator.frequency.linearRampToValueAtTime(440,ctx.currentTime+1);
    gain.gain.setValueAtTime(0.08,ctx.currentTime); gain.gain.linearRampToValueAtTime(0,ctx.currentTime+1.5);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime+1.5);
  }
  async function toggleSound() {
    if (armed) { setArmed(false); void audio.current?.suspend(); return; }
    try { audio.current ??= new AudioContext(); await audio.current.resume(); setSoundError(''); setArmed(true); tone(); } catch { setSoundError('El navegador no habilitó el audio. Las alertas visuales siguen activas.'); }
  }
  useEffect(()=>{ if(attention && armed && !warned.current) { tone(); warned.current=true; } if(!attention) warned.current=false; },[attention,armed]);
  useEffect(()=>()=>{void audio.current?.close();},[]);
  const community=selected?nearestReference(selected.lat,selected.lng,'comunidad'):null;
  const area=selected?nearestReference(selected.lat,selected.lng,'área'):null;
  const projection=selected&&horizon&&weather?projectFire(selected.lat,selected.lng,weather,horizon):null;
  return <div className="space-y-2 border-t border-border pt-2">
    {attention && <div role="alert" className="priority-alert flex items-start gap-2 rounded border border-destructive bg-destructive/20 p-2 text-destructive"><Siren className="h-5 w-5 shrink-0"/><div><b className="font-mono text-xs">PRIORIDAD ALTA · VERIFICAR EN CAMPO</b><p className="text-xs">{alerts.length} foco(s) FIRMS reciente(s) a menos de 5 km de una referencia poblada: {alerts.map(a=>`${nearestReference(a.lat,a.lng,'comunidad')?.name} (${formatDateTime(a.date)})`).join('; ')}.</p><p className="text-xs text-muted-foreground">Fuente: NASA {snapshotSource} · datos actualizados {formatDateTime(snapshotUpdated)}. Detección satelital pendiente de verificación en campo; contacta al 119. No es una orden de evacuación: las evacuaciones solo las declara la autoridad oficial.</p></div></div>}
    <div className="flex flex-wrap gap-2"><TacButton tone={armed?'success':'ghost'} aria-pressed={armed} onClick={()=>void toggleSound()}>{armed?<Volume2 className="h-4 w-4"/>:<VolumeX className="h-4 w-4"/>}{armed?'Sonido activo':'Habilitar sirena'}</TacButton><TacButton onClick={()=>setChannel(true)}><Radio className="h-4 w-4"/>Canal / SOS</TacButton></div>
    {soundError && <p className="text-xs text-warning">{soundError}</p>}
    {selected && <div className="text-xs"><span className="text-warning">Por verificar · </span>{community?.name}: <b className="font-mono">{community?.km.toFixed(1)} km</b><br/><span className="text-success">{area?.name}: {area?.km.toFixed(1)} km</span><p className="text-muted-foreground">Distancia en línea recta a referencias; catálogo parcial, no límites ni rutas seguras.</p></div>}
    <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] text-primary">ESCENARIO EXPLORATORIO</span>{([0,1,3,6] as const).map(h=><TacButton key={h} tone={horizon===h?'primary':'ghost'} aria-pressed={horizon===h} onClick={()=>onHorizon(h)}>{h?`${h}h`:'Off'}</TacButton>)}</div>
    {horizon>0 && <p className="text-xs text-warning">{projection?`Envolvente ${projection.km.toFixed(2)} km · `:''}Viento {weatherReal?`POWER diario ${weatherDate??''}`:'sin dato NASA'}, no tiempo real. Modelo heurístico sin IA entrenada ni validación; no usar para evacuación o despliegue.</p>}
    {horizon>0 && selected && <p className="text-xs text-muted-foreground">Prioridad de evaluación: comunidades a sotavento y flancos del escenario. Ubicación de cortafuegos pendiente de combustible, pendiente y validación de brigadas; no se recomienda un trazado operativo.</p>}
    <Dialog open={channel} onOpenChange={setChannel}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="font-mono text-primary">CENTINELA · Comunicación táctica</DialogTitle></DialogHeader><FieldChannel regionId={regionId}/></DialogContent></Dialog>
  </div>;
}