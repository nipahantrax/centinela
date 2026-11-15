import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogIn, MapPin, Phone, Send, Share2, Siren } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { departmentAt, REGIONS } from '@/lib/nasa-data';
import { emergencyMessage } from '@/lib/fire-operations';
import { NATIONAL_CONTACTS } from '@/lib/emergency-contacts';
import { formatDateTime } from '@/lib/format';
import { TacButton } from './Brand';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type GPS = { lat: number; lng: number; accuracy: number };
export function FieldChannel({ regionId }: { regionId: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [department, setDepartment] = useState(regionId === 'all' ? 'Cochabamba' : regionId);
  const [body, setBody] = useState('');
  const [gps, setGps] = useState<GPS | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  useEffect(() => { if (regionId !== 'all') setDepartment(regionId); }, [regionId]);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setUserId(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const messages = useQuery({ queryKey: ['field-channel', userId, department], enabled: Boolean(userId), queryFn: async () => {
    const { data, error } = await supabase.from('field_messages').select('*').eq('department', department).eq('user_id', userId ?? '').order('created_at', { ascending: false }).limit(50);
    if (error) throw new Error('No se pudo leer el canal. Intenta nuevamente.');
    return data;
  } });
  useEffect(() => {
    setConnected(false);
    if (!userId) return;
    const channel = supabase.channel(`field-${department}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'field_messages', filter: `department=eq.${department}` }, () => { void messages.refetch(); }).subscribe(status => setConnected(status === 'SUBSCRIBED'));
    return () => { void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, department]);
  async function login(provider: 'google') {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setError('No se pudo iniciar sesión. Intenta nuevamente.');
  }
  function locate() {
    setBusy(true); setError(''); setGps(null); setConsent(false);
    if (!navigator.geolocation) { setBusy(false); setError('GPS no disponible. Llama al 119 o 110.'); return; }
    navigator.geolocation.getCurrentPosition(p => {
      const dept = departmentAt(p.coords.latitude, p.coords.longitude);
      setBusy(false);
      if (!dept) { setError('Ubicación fuera de Bolivia. El reporte no se enviará.'); return; }
      setDepartment(dept); setGps({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy});
    }, () => { setBusy(false); setError('No se obtuvo GPS. Activa la ubicación o llama al 119 / 110.'); }, { enableHighAccuracy:true, timeout:20000, maximumAge:0 });
  }
  async function send(kind: 'novedad' | 'sos') {
    if (!userId) { setError('Inicia sesión para registrar novedades en el canal.'); return; }
    if (!body.trim()) { setError('Describe lo observado antes de enviar.'); return; }
    if (kind === 'sos' && (!gps || !consent)) { setError('Obtén GPS y confirma que deseas compartirlo.'); return; }
    setBusy(true); setError('');
    const { error } = await supabase.from('field_messages').insert({ user_id:userId, department, kind, body:body.trim(), ...(kind === 'sos' && gps ? {latitude:gps.lat,longitude:gps.lng,accuracy_m:gps.accuracy} : {}) });
    setBusy(false);
    if (error) { setError('No se guardó el reporte. Revisa la conexión; llama si hay peligro inmediato.'); return; }
    await messages.refetch(); setBody(''); setSosOpen(false); setGps(null); setConsent(false);
    toast.success('Reporte guardado en el canal. No confirma despacho de emergencias.');
  }
  const template = gps ? emergencyMessage(gps.lat,gps.lng,gps.accuracy,body.trim() || 'Fuego o humo observado; solicito evaluación.') : '';
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-mono text-xs text-primary">CANAL DE CAMPO</h3><span className={`text-xs ${connected ? 'text-success' : 'text-warning'}`}>{connected ? '● Conectado' : userId ? 'Sin conexión en vivo' : 'Sesión requerida'}</span></div>
    <p className="text-xs text-muted-foreground">Tus reportes privados · sin despacho automático a emergencias.</p>
    {!userId && <div className="grid gap-2"><TacButton onClick={() => void login('google')}><LogIn className="h-4 w-4" /> Ingresar con Google</TacButton></div>}
    <label className="block text-xs text-muted-foreground">Departamento<select aria-label="Departamento del canal" value={department} onChange={e=>setDepartment(e.target.value)} className="mt-1 h-9 w-full rounded border border-input bg-background px-2">{REGIONS.filter(r=>r.id!=='all').map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    <div className="max-h-48 space-y-2 overflow-y-auto" aria-live="polite">
      {messages.error && <p role="alert" className="text-xs text-warning">{messages.error.message}</p>}
      {userId && messages.data?.length === 0 && <p className="text-xs text-muted-foreground">No has registrado reportes en este departamento.</p>}
      {messages.data?.map(m=><article key={m.id} className={`border-l-2 pl-2 text-xs ${m.kind==='sos'?'border-destructive':'border-primary'}`}><div className="font-mono text-muted-foreground">{m.kind.toUpperCase()} · {formatDateTime(m.created_at)} · {m.user_id===userId?'Tú':'Participante'}</div><p className="whitespace-pre-wrap break-words">{m.body}</p>{m.latitude!==null && m.longitude!==null && <a className="text-primary" href={`https://www.google.com/maps?q=${m.latitude},${m.longitude}`} target="_blank" rel="noopener noreferrer">GPS {m.latitude.toFixed(6)}, {m.longitude.toFixed(6)} · ±{Math.round(m.accuracy_m??0)} m</a>}</article>)}
    </div>
    <textarea aria-label="Novedad de campo" value={body} onChange={e=>setBody(e.target.value)} maxLength={2000} rows={3} placeholder="Lugar, fuego o humo, personas en riesgo…" className="w-full resize-y rounded border border-input bg-background p-2 text-sm" />
    {error && <p role="alert" className="text-xs text-warning">{error}</p>}
    <div className="grid grid-cols-2 gap-2"><TacButton disabled={busy || !userId} onClick={()=>void send('novedad')}><Send className="h-4 w-4"/>Enviar</TacButton><TacButton tone="danger" onClick={()=>{setSosOpen(true);locate();}}><Siren className="h-4 w-4"/>SOS · GPS</TacButton></div>
    <div className="flex flex-wrap gap-3 text-sm">{NATIONAL_CONTACTS.map(c => <a key={c.number} className={c.number === '119' ? 'text-destructive' : 'text-primary'} href={`tel:${c.number}`}><Phone className="mr-1 inline h-3 w-3"/>{c.name} {c.number}</a>)}</div>
    <Dialog open={sosOpen} onOpenChange={setSosOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle className="text-destructive">SOS · Alerta comunitaria</DialogTitle></DialogHeader>
      <p className="text-sm">Si hay peligro inmediato, llama al 119 o 110. Este canal no garantiza atención ni movilización.</p>
      <TacButton disabled={busy} onClick={locate}><MapPin className="h-4 w-4"/>{busy?'Obteniendo GPS…':'Actualizar GPS'}</TacButton>
      {gps && <p className="font-mono text-xs">{gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} · ±{Math.round(gps.accuracy)} m · {department}</p>}
      <textarea aria-label="Descripción SOS" value={body} onChange={e=>setBody(e.target.value)} maxLength={2000} rows={3} placeholder="Describe la emergencia" className="rounded border border-input bg-background p-2"/>
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Autorizo guardar estas coordenadas en mi reporte privado o compartirlas con el contacto que elija.</label>
      {error && <p role="alert" className="text-warning">{error}</p>}
      <TacButton tone="danger" disabled={busy||!gps||!consent||!userId} onClick={()=>void send('sos')}><Send className="h-4 w-4"/>Registrar SOS en el canal</TacButton>
      <label className="text-sm">WhatsApp / COE local · número confirmado con código de país<input aria-label="Número WhatsApp de emergencia" value={phone} onChange={e=>setPhone(e.target.value.replace(/[^0-9+]/g,''))} placeholder="+591…" className="mt-1 h-10 w-full rounded border border-input bg-background px-2"/></label>
      <TacButton disabled={!gps||!consent||!/^\+?[1-9]\d{7,14}$/.test(phone)} onClick={()=>window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(template)}`,'_blank','noopener,noreferrer')}><Share2 className="h-4 w-4"/>Abrir WhatsApp con mensaje</TacButton>
      <p className="text-xs text-muted-foreground">No contamos con un contacto COE nacional verificado. WhatsApp requiere que confirmes el destinatario y envíes el mensaje.</p>
      <div className="flex gap-4">{NATIONAL_CONTACTS.map(c => <a key={c.number} href={`tel:${c.number}`} className={c.number === '119' ? 'text-destructive' : 'text-primary'}>Llamar {c.number}</a>)}</div>
    </DialogContent></Dialog>
  </div>;
}