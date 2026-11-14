import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { type Incident, type Node } from "@/lib/centinela-data";
import { nearestReference, projectFire, REFERENCE_POINTS, type Horizon } from '@/lib/fire-operations';
import { classifyFrp } from '@/lib/fire-indices';
import { TacButton } from './Brand';
import { escapeMapText } from "@/lib/map-content";
import { formatDateTime } from "@/lib/format";
import { departmentAt, gibsUrl } from "@/lib/nasa-data";
import boundaries from "@/data/bolivia-departments.json";
import type { GeoJsonObject } from "geojson";

export interface Layers { thermal: boolean; viirs?: boolean; modis?: boolean; viirsThermal?: boolean }

interface Props {
  incidents: Incident[];
  selectedId?: string | undefined;
  onSelect?: (id: string) => void;
  center: [number, number];
  zoom: number;
  layers: Layers;
  wind: { deg: number; kmh: number };
  gibsDates?: { viirs: string | null; modis: string | null; viirsThermal?: string | null } | undefined;
  horizon?: Horizon | 0;
  weather?: Node['weather'] | null;
  onPoint?: (point: [number, number]) => void;
  national?: boolean;
}

function css(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function TacticalMap({ incidents, selectedId, onSelect, center, zoom, layers, wind, gibsDates, onPoint, national, horizon = 0, weather }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const group = useRef<Leaflet.LayerGroup | null>(null);
  const satellites = useRef<Leaflet.LayerGroup | null>(null);
  const satelliteKey = useRef("");
  const basemap = useRef<Leaflet.TileLayer | null>(null);
  const [base, setBase] = useState<'satellite'|'dark'>('satellite');
  const [mapError, setMapError] = useState("");
  const [waterOn, setWaterOn] = useState(false);
  const [waterStatus, setWaterStatus] = useState("");
  const waterEnabled = useRef(false);
  waterEnabled.current = waterOn;
  const routeRequest = useRef(0);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const water = useRef<Leaflet.LayerGroup | null>(null);
  const waterBounds = useRef("");
  const me = useRef<Leaflet.LayerGroup | null>(null);
  const watchId = useRef<number | null>(null);
  const myPos = useRef<[number, number] | null>(null);
  const routeLayer = useRef<Leaflet.LayerGroup | null>(null);
  const [routeInfo, setRouteInfo] = useState("");
  const latest = useRef({ incidents, selectedId, center, zoom, layers, wind, gibsDates, onPoint, national, horizon, weather });
  latest.current = { incidents, selectedId, center, zoom, layers, wind, gibsDates, onPoint, national, horizon, weather };
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then(async (mod) => {
      if (cancelled || !el.current || map.current) return;
      const lib = (mod as unknown as { default: typeof Leaflet }).default ?? mod;
      L.current = lib;
      (window as unknown as { L: typeof Leaflet }).L = lib;
      await import("leaflet.vectorgrid");
      if (cancelled || !el.current) return;
      map.current = lib.map(el.current, { zoomControl: false, attributionControl: true }).setView(center, zoom);
      basemap.current = lib.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles © Esri · Source: Esri, Maxar, Earthstar Geographics · NASA", maxZoom: 18,
      }).addTo(map.current);
      basemap.current.on('tileerror',()=>setMapError('Una imagen Esri no cargó. Prueba la base oscura.'));
      lib.control.zoom({ position: "bottomright" }).addTo(map.current);
      group.current = lib.layerGroup().addTo(map.current);
      satellites.current = lib.layerGroup().addTo(map.current);
      water.current = lib.layerGroup().addTo(map.current);
      me.current = lib.layerGroup().addTo(map.current);
      routeLayer.current = lib.layerGroup().addTo(map.current);
      map.current.on("popupopen", (e: Leaflet.PopupEvent) => {
        const root = e.popup.getElement();
        root?.querySelectorAll<HTMLButtonElement>("button[data-route]").forEach(b => {
          b.onclick = () => void planRoute(b.dataset['route'] as 'access' | 'escape', Number(b.dataset['lat']), Number(b.dataset['lng']));
        });
      });
      map.current.on("moveend", () => { if (waterEnabled.current) void loadWater(); });
      map.current.on("click", (e: Leaflet.LeafletMouseEvent) => {
        if (departmentAt(e.latlng.lat, e.latlng.lng)) latest.current.onPoint?.([e.latlng.lat, e.latlng.lng]);
      });
      map.current.setView(latest.current.center, latest.current.zoom);
      setReady(true);
      draw();
    }).catch(() => setMapError("El mapa no pudo cargar. Los datos NASA siguen disponibles; intenta recargar."));
    return () => { cancelled = true; map.current?.remove(); map.current = null; satelliteKey.current = ''; basemap.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { map.current?.flyTo(center, zoom, { duration: 1.2 }); }, [center, zoom]);

  async function loadWater() {
    const m = map.current, lib = L.current;
    if (!m || !lib || !water.current || !waterEnabled.current) return;
    if (m.getZoom() < 10) { water.current.clearLayers(); waterBounds.current = ""; setWaterStatus("Acerca el mapa para consultar agua en una zona concreta."); return; }
    const b = m.getBounds().pad(0.1);
    const key = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].map(n => n.toFixed(2)).join(",");
    if (key === waterBounds.current) return;
    waterBounds.current = key;
    setWaterStatus("Buscando puntos de agua cercanos (OpenStreetMap)…");
    const q = `[out:json][timeout:25];(node["natural"="water"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});node["amenity"="fire_hydrant"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});node["waterway"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});way["natural"="water"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}););out center 60;`;
    const mirrors = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
    try {
      let data: { elements?: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] } | null = null;
      for (const url of mirrors) {
        try {
          const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `data=${encodeURIComponent(q)}`, signal: AbortSignal.timeout(30000) });
          if (res.ok) { data = await res.json(); break; }
        } catch { /* probar el siguiente espejo */ }
      }
      if (!data) throw new Error("mirrors");
      if (!waterEnabled.current || waterBounds.current !== key || !water.current) return;
      water.current.clearLayers();
      let n = 0;
      for (const el of data.elements ?? []) {
        const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
        if (lat == null || lon == null) continue;
        const tags = el.tags ?? {};
        const kind = tags["amenity"] === "fire_hydrant" ? "Hidrante" : tags["waterway"] ? `Curso de agua (${tags["waterway"]})` : "Cuerpo de agua";
        lib.circleMarker([lat, lon], { radius: 5, color: css("--primary"), fillColor: css("--primary"), fillOpacity: 0.7, weight: 1.5 })
          .bindPopup(`<b>${escapeMapText(kind)}</b><br>${escapeMapText(tags["name"] ?? "Sin nombre registrado")}<br><span style="font-family:monospace">${lat.toFixed(5)}, ${lon.toFixed(5)}</span><br><small>Fuente: OpenStreetMap (colaborativo). Caudal, acceso y extracción no verificados.</small>`)
          .addTo(water.current);
        if (++n >= 60) break;
      }
      setWaterStatus(n ? `${n} puntos de agua visibles · OpenStreetMap (datos colaborativos, verificar en terreno)` : "Sin puntos de agua registrados en esta zona de OpenStreetMap.");
    } catch {
      if (!waterEnabled.current || waterBounds.current !== key) return;
      waterBounds.current = "";
      setWaterStatus("No se pudieron cargar los puntos de agua. Reintentar al mover el mapa.");
    }
  }

  useEffect(() => {
    if (!waterOn) { water.current?.clearLayers(); waterBounds.current = ""; setWaterStatus(""); return; }
    void loadWater();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waterOn, ready]);

  function toggleLocate() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      me.current?.clearLayers();
      setLocating(false);
      myPos.current = null;
      return;
    }
    if (!navigator.geolocation) { setMapError("Tu dispositivo no tiene GPS disponible."); return; }
    setLocating(true);
    let first = true;
    watchId.current = navigator.geolocation.watchPosition((p) => {
      const lib = L.current;
      if (!lib || !me.current) return;
      me.current.clearLayers();
      const ll: [number, number] = [p.coords.latitude, p.coords.longitude];
      myPos.current = ll;
      lib.circle(ll, { radius: p.coords.accuracy, color: css("--primary"), weight: 1, fillOpacity: 0.08 }).addTo(me.current);
      lib.marker(ll, { icon: lib.divIcon({ className: "", html: `<div class="fire-marker" style="width:16px;height:16px"><div class="ring"></div><div class="core" style="background:var(--primary)"></div></div>`, iconSize: [16, 16], iconAnchor: [8, 8] }) })
        .bindPopup(`<b>Tu ubicación</b><br><span style="font-family:monospace">${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}</span><br><small>Precisión aprox. ${Math.round(p.coords.accuracy)} m · GPS del dispositivo</small>`)
        .addTo(me.current);
      if (first && map.current) { map.current.flyTo(ll, Math.max(map.current.getZoom(), 12)); first = false; }
    }, () => { setMapError("No fue posible obtener tu ubicación GPS. Revisa los permisos del navegador."); setLocating(false); if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; } }, { enableHighAccuracy: true, maximumAge: 5000 });
  }

  function getPosition(): Promise<[number, number]> {
    if (myPos.current) return Promise.resolve(myPos.current);
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error("sin GPS"));
      navigator.geolocation.getCurrentPosition(p => { myPos.current = [p.coords.latitude, p.coords.longitude]; res(myPos.current); }, rej, { enableHighAccuracy: true, timeout: 15000 });
    });
  }

  async function planRoute(kind: 'access' | 'escape', fLat: number, fLng: number) {
    const lib = L.current, layer = routeLayer.current;
    if (!lib || !layer) return;
    const request = ++routeRequest.current;
    layer.clearLayers();
    map.current?.closePopup();
    setRouteInfo("Obteniendo tu ubicación GPS…");
    let from: [number, number];
    try { from = await getPosition(); } catch { setRouteInfo("Necesito tu ubicación GPS para calcular la ruta. Activa el permiso de ubicación."); return; }
    if (request !== routeRequest.current) return;
    let to: [number, number] = [fLat, fLng];
    let label = "Ruta orientativa de llegada";
    if (kind === 'escape') {
      const fireKm = (a: [number, number]) => Math.hypot(a[0] - fLat, (a[1] - fLng) * Math.cos(fLat * Math.PI / 180)) * 111;
      const myFire = fireKm(from);
      const safe = REFERENCE_POINTS.filter(p => p.kind === 'comunidad')
        .map(p => ({ p, d: Math.hypot(p.lat - from[0], (p.lng - from[1]) * Math.cos(from[0] * Math.PI / 180)) * 111, f: fireKm([p.lat, p.lng]) }))
        .filter(x => x.f > myFire + 5).sort((a, b) => a.d - b.d)[0];
      if (!safe) { setRouteInfo("No encontré un poblado de referencia alejado del foco. Sigue las instrucciones de las autoridades."); return; }
      to = [safe.p.lat, safe.p.lng];
      label = `Ruta orientativa hacia ${safe.p.name} (seguridad no verificada)`;
    }
    setRouteInfo("Calculando ruta por caminos reales…");
    try {
      const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`, { signal: AbortSignal.timeout(15000) });
      const j = await r.json();
      const route = j.routes?.[0];
      if (!r.ok || !route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration) || !Array.isArray(route.geometry?.coordinates) || route.geometry.coordinates.length < 2) throw new Error();
      if (request !== routeRequest.current) return;
      layer.clearLayers();
      const coords = (route.geometry.coordinates as [number, number][]).map(([x, y]) => [y, x] as [number, number]);
      const color = css(kind === 'escape' ? '--success' : '--primary');
      lib.polyline(coords, { color, weight: 9, opacity: 0.25 }).addTo(layer);
      lib.polyline(coords, { color, weight: 4, dashArray: kind === 'escape' ? '8 6' : undefined }).addTo(layer);
      lib.circleMarker(to, { radius: 7, color, fillOpacity: 0.9 }).addTo(layer);
      map.current?.closePopup(); map.current?.fitBounds(lib.latLngBounds(coords), { paddingTopLeft: [20, 60], paddingBottomRight: [60, 200] });
      const km = (route.distance / 1000).toFixed(1), min = Math.round(route.duration / 60);
      const gmaps = `https://www.google.com/maps/dir/?api=1&origin=${from[0]},${from[1]}&destination=${to[0]},${to[1]}&travelmode=driving`;
      setRouteInfo(`${label}: ${km} km · ~${min} min en vehículo (sin tráfico ni cortes de camino; confirmar en terreno).|${gmaps}`);
    } catch { if (request !== routeRequest.current) return; setRouteInfo("No se pudo calcular la ruta ahora (servicio de rutas OpenStreetMap no respondió o no hay caminos). Intenta de nuevo."); }
  }

  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); }, []);
  useEffect(() => { basemap.current?.setUrl(base === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'); }, [base]);
  useEffect(() => { draw(); }, [ready, incidents, selectedId, layers, gibsDates, national, horizon, weather, routeInfo]);

  function draw() {
    const lib = L.current, g = group.current;
    if (!lib || !g) return;
    const { incidents, selectedId, layers, gibsDates, national, horizon, weather } = latest.current;
    g.clearLayers();
    const success = css("--success"), primary = css("--primary"), fire = css("--fire"), warn = css("--warning");
    const key = JSON.stringify([layers.viirs, layers.modis, layers.viirsThermal, gibsDates]);
    if (key !== satelliteKey.current && satellites.current) {
      satelliteKey.current = key;
      satellites.current.clearLayers();
      setMapError("");
      const errors = () => setMapError("Una capa NASA no pudo cargar; se mantiene el mapa táctico.");
      if (layers.viirs && gibsDates?.viirs) lib.tileLayer(gibsUrl("viirs", gibsDates.viirs), { maxNativeZoom: 9, maxZoom: 16, attribution: "NASA GIBS · VIIRS" }).on("tileerror", errors).addTo(satellites.current);
      for (const thermal of ['modis','viirsThermal'] as const) {
        const date = gibsDates?.[thermal];
        if (!layers[thermal]) continue;
        if (!date) { setMapError('Fecha térmica NASA no disponible; se mantienen Esri y los eventos EONET/FIRMS.'); continue; }
        const vg = lib as typeof Leaflet & { vectorGrid: { protobuf: (url: string, options: object) => Leaflet.GridLayer } };
        const style = { radius: 4, color: fire, fillColor: fire, fill: true, fillOpacity: 0.9, weight: 1 };
        vg.vectorGrid.protobuf(gibsUrl(thermal, date), { maxNativeZoom: thermal === 'modis' ? 7 : 8, maxZoom: 18, interactive: false, attribution: `NASA GIBS · ${thermal === 'modis' ? 'MODIS' : 'VIIRS SNPP'}`, vectorTileLayerStyles: new Proxy({}, { get: () => style }) }).on("tileerror", errors).addTo(satellites.current);
        // VectorGrid silently treats HTTP errors as empty tiles: probe explicitly so
        // a NASA outage is not confused with the absence of thermal anomalies.
        const z = Math.min(map.current?.getZoom() ?? 6, thermal === 'modis' ? 7 : 8);
        const point = map.current?.getCenter();
        if (point) {
          const projected = lib.CRS.EPSG3857.latLngToPoint(point, z).divideBy(256).floor();
          const url = gibsUrl(thermal, date).replace("{z}", String(z)).replace("{y}", String(projected.y)).replace("{x}", String(projected.x));
          void fetch(url, { signal: AbortSignal.timeout(10000) }).then(r => { if (!r.ok && satelliteKey.current === key) setMapError(`NASA ${thermal === 'modis' ? 'MODIS' : 'VIIRS térmica'} no devuelve datos para esta fecha. Esri y eventos EONET/FIRMS siguen disponibles.`); }).catch(() => { if (satelliteKey.current === key) errors(); });
        }
      }
    }
    if (national) lib.geoJSON(boundaries as GeoJsonObject, { style: { color: primary, weight: 1, fillOpacity: 0.015 } }).addTo(g);
    if (layers.thermal) {
      incidents.forEach((i) => {
        if (i.status !== "Controlado" && i.id === selectedId && horizon && weather) {
          lib.polygon(projectFire(i.lat, i.lng, weather, horizon).polygon, { color: warn, weight: 2, dashArray: '5 5', fillColor: fire, fillOpacity: 0.2 }).bindTooltip(`Escenario ${horizon}h · heurística no validada, no pronóstico operativo`).addTo(g);
        }
        const isHarmonized = i.source === "MODIS+VIIRS armonizado";
        const frpData = classifyFrp(i.frp);
        const size = Math.round((isHarmonized ? 14 : 10) + Math.min(i.frp ?? 10, 50) / 2.2);
        const ringBorder = isHarmonized ? `border: 2px solid ${primary}; box-shadow: 0 0 10px ${primary};` : "";
        const icon = lib.divIcon({
          className: "",
          html: `<div class="fire-marker" style="width:${size}px;height:${size}px;opacity:${0.5 + (i.confidence ?? 70) / 200}">
            ${i.status === "Controlado" ? "" : `<div class="ring" style="${ringBorder}"></div>`}
            <div class="core" style="${i.status === "Controlado" ? `background:${success};box-shadow:none` : isHarmonized ? `background:${primary};box-shadow:0 0 8px ${primary}` : ""}${i.id === selectedId ? `;outline:2px solid ${primary};outline-offset:3px` : ""}"></div>
          </div>`,
          iconSize: [size, size], iconAnchor: [size / 2, size / 2],
        });
        const near = nearestReference(i.lat,i.lng,'comunidad');
        const protectedPoint = nearestReference(i.lat,i.lng,'área');
        const popup = `<div style="max-width:260px;font-size:12px;line-height:1.4">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <b style="color:${isHarmonized ? 'var(--primary)' : 'inherit'}">${isHarmonized ? '⭐ FOCO ARMONIZADO' : 'DETECCIÓN TÉRMICA'}</b>
            <span style="font-size:10px;padding:2px 4px;border-radius:4px;background:var(--muted);font-family:monospace">${escapeMapText(i.source)}</span>
          </div>
          <div style="font-size:11px;color:var(--muted-foreground);margin-bottom:6px">
            Captura: <b>${escapeMapText(formatDateTime(i.date))}</b>
          </div>
          <b>Coordenadas:</b> <span style="font-family:monospace">${i.lat.toFixed(5)}, ${i.lng.toFixed(5)}</span><br>
          <b>Comunidad cercana:</b> ${escapeMapText(near?.name ?? "N/D")} (${near ? near.km.toFixed(1) : "?"} km)<br>
          <b>Área protegida:</b> ${escapeMapText(protectedPoint?.name ?? "N/D")} (${protectedPoint ? protectedPoint.km.toFixed(1) : "?"} km)<br>
          <div style="margin:4px 0;padding:4px;border-radius:4px;background:rgba(255,255,255,0.05);border-left:3px solid ${isHarmonized ? 'var(--primary)' : 'var(--fire)'}">
            <b>Intensidad (FRP):</b> ${i.frp ?? "N/D"} MW · <span style="font-weight:700">${escapeMapText(frpData.category)}</span><br>
            <b>Confianza NASA:</b> ${i.confidence ?? "N/D"}% ${isHarmonized ? '(Dual Corroborado)' : ''}<br>
            <b>Agua estimada de ataque:</b> ~${frpData.recommendedWaterLiters} L
          </div>
          <div style="display:flex;gap:4px;margin:6px 0">
            <button data-route="access" data-lat="${i.lat}" data-lng="${i.lng}" style="flex:1;min-height:38px;padding:6px;font-size:12px;border-radius:6px;background:var(--primary);color:var(--primary-foreground);font-weight:700">🚒 Ruta bomberos</button>
            <button data-route="escape" data-lat="${i.lat}" data-lng="${i.lng}" style="flex:1;min-height:38px;padding:6px;font-size:12px;border-radius:6px;background:var(--success);color:var(--background);font-weight:700">🏃 Ruta de escape</button>
          </div>
          <small style="color:var(--muted-foreground);display:block;font-size:10px">Pendiente de verificación en campo. Distancia a puntos de referencia.</small>
        </div>`;
        const marker = lib.marker([i.lat, i.lng], { icon }).bindPopup(popup)
          .on("click", () => onSelectRef.current?.(i.id)).addTo(g);
        // Al seleccionar un foco el mapa se redibuja; reabrir su popup explicativo.
        if (i.id === selectedId && !routeInfo) setTimeout(() => { if (map.current?.hasLayer(marker)) marker.openPopup(); }, 0);
      });
    }
    if (national) REFERENCE_POINTS.forEach(p=>lib.circleMarker([p.lat,p.lng],{radius:p.kind==='área'?4:3,color:p.kind==='área'?success:primary,fillOpacity:0.6,weight:1}).bindTooltip(`${p.name} · punto de referencia, no límite`).addTo(g));
  }

  return (
    <div className="relative h-full w-full">
      <div ref={el} className="h-full w-full" />
      <div className="glass absolute left-2 top-2 z-[400] flex gap-1 rounded p-1">
        <TacButton aria-pressed={base==='satellite'} onClick={()=>setBase('satellite')} tone={base==='satellite'?'primary':'ghost'} className="px-2 py-1 text-[10px]">Satélite HD</TacButton>
        <TacButton aria-pressed={base==='dark'} onClick={()=>setBase('dark')} tone={base==='dark'?'primary':'ghost'} className="px-2 py-1 text-[10px]">Oscuro</TacButton>
      </div>
      <div className="glass absolute right-2 top-2 z-[400] flex flex-col gap-1 rounded p-1">
        <TacButton aria-pressed={waterOn} onClick={()=>setWaterOn(v=>!v)} tone={waterOn?'primary':'ghost'} className="px-2 py-1 text-[10px]">💧 Agua cercana</TacButton>
        <TacButton aria-pressed={locating} onClick={toggleLocate} tone={locating?'primary':'ghost'} className="px-2 py-1 text-[10px]">📍 Mi ubicación</TacButton>
      </div>

      {routeInfo && (() => { const [txt = "", link] = routeInfo.split("|"); const [title, detail] = txt.includes(": ") ? [txt.slice(0, txt.indexOf(": ")), txt.slice(txt.indexOf(": ") + 2)] : ["Ruta", txt]; return (
        <div role="status" aria-live="polite" className="glass absolute bottom-24 left-2 right-14 z-[401] max-h-[30%] overflow-y-auto rounded-md p-2 text-foreground sm:right-auto sm:max-w-sm">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wide text-primary">{title}</div>
              <div className="text-sm leading-snug">{detail}</div>
            </div>
            <TacButton tone="ghost" onClick={() => { routeRequest.current++; setRouteInfo(""); routeLayer.current?.clearLayers(); }} className="h-9 w-9 shrink-0 p-0 text-lg" aria-label="Cerrar ruta">✕</TacButton>
          </div>
          {link && <a href={link} target="_blank" rel="noreferrer" className="mt-2 flex min-h-11 items-center justify-center rounded bg-primary px-3 text-sm font-bold text-primary-foreground">Navegar con GPS</a>}
        </div>); })()}
      {(mapError || waterStatus) && <details className="glass absolute bottom-20 left-2 right-14 z-[400] max-h-24 overflow-y-auto rounded-md p-2 text-[10px]"><summary className="cursor-pointer text-warning">Estado del mapa{waterStatus ? " · Agua" : ""}</summary>{mapError && <p role="status">{mapError}</p>}{waterStatus && <p role="status">{waterStatus}</p>}</details>}
      <div className="glass pointer-events-none absolute bottom-14 left-2 right-12 z-[400] rounded p-1 font-mono text-[9px] text-foreground">Esri: mosaico, no imagen en vivo. {layers.viirs && `True Color ${gibsDates?.viirs ?? "N/D"}`} {layers.viirsThermal && ` · VIIRS térmica ${gibsDates?.viirsThermal ?? "N/D"}`} {layers.modis && ` · MODIS ${gibsDates?.modis ?? "N/D"}`}</div>
    </div>
  );
}
