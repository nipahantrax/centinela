import { useEffect, useRef, useState, useMemo } from "react";
import type * as Leaflet from "leaflet";
import {
  type Incident,
  type Node,
  NODES,
  HUMAN_RISK_POINTS,
  TUNARI_BOUNDARY,
  COCHABAMBA_MUNICIPALITIES_POLYGONS,
  CARTOGRAPHIC_LABELS,
  EVAC_ROUTES,
  PREVENTIVE_30_ZONES,
  WATER_RESOURCES,
  findNearestWaterResource,
  RECURRENCE_CLUSTERS,
  VEGETATION_ZONES,
  spreadCone,
} from "@/lib/centinela-data";
import {
  nearestReference,
  projectFire,
  REFERENCE_POINTS,
  calculatePropagationForecast,
  type PropagationForecast,
  type Horizon,
} from "@/lib/fire-operations";
import { classifyFrp } from "@/lib/fire-indices";
import { TacButton } from "./Brand";
import { escapeMapText, buildHotspotPopupHtml, buildCisternPopupHtml, buildHumanRiskPopupHtml } from "@/lib/map-content";
import { formatDateTime } from "@/lib/format";
import { departmentAt, gibsUrl } from "@/lib/nasa-data";
import boundaries from "@/data/bolivia-departments.json";
import type { GeoJsonObject } from "geojson";
import { clusterHotspots, type HotspotCluster } from "@/lib/webgl-clustering";
import { WebGLThermalLayer } from "./WebGLThermalLayer";
import { PreventiveLegend, type TacticalMapMode } from "./PreventiveLegend";
import { useI18n } from "@/lib/i18n";
import {
  Satellite,
  Flame,
  Droplets,
  Trees,
  Truck,
  Flag,
  Map as MapIcon,
  Mountain,
  Wind,
  Crosshair,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Share2,
  Navigation,
  Compass,
  X,
  Plus,
  Minus,
  Footprints,
  Activity,
  Zap,
} from "lucide-react";

export interface Layers {
  thermal: boolean;
  viirs?: boolean;
  modis?: boolean;
  viirsThermal?: boolean;
}

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
  weather?: Node["weather"] | null;
  onPoint?: (point: [number, number]) => void;
  national?: boolean;
  mode?: TacticalMapMode;
  onModeChange?: (mode: TacticalMapMode) => void;
  selectedRegionId?: string;
  onSelectRegion?: (regionId: string) => void;
}

function css(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function TacticalMap({
  incidents,
  selectedId,
  onSelect,
  center,
  zoom,
  layers,
  wind,
  gibsDates,
  onPoint,
  national,
  horizon = 0,
  weather,
  mode,
  onModeChange,
  selectedRegionId,
  onSelectRegion,
}: Props) {
  const { t } = useI18n();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const group = useRef<Leaflet.LayerGroup | null>(null);
  const satellites = useRef<Leaflet.LayerGroup | null>(null);
  const satelliteKey = useRef("");
  const basemap = useRef<Leaflet.TileLayer | null>(null);
  const [base, setBase] = useState<"satellite" | "dark">("satellite");
  const [mapError, setMapError] = useState("");
  const routeRequest = useRef(0);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const me = useRef<Leaflet.LayerGroup | null>(null);
  const watchId = useRef<number | null>(null);
  const myPos = useRef<[number, number] | null>(null);
  const routeLayer = useRef<Leaflet.LayerGroup | null>(null);
  const [routeInfo, setRouteInfo] = useState("");
  const lastTarget = useRef<{ lat: number; lng: number; zoom: number }>({
    lat: center[0],
    lng: center[1],
    zoom,
  });

  // Modo Operativo Táctico: 1. Prevención e Ignición / 2. Intercepción y Combate
  const [internalMode, setInternalMode] = useState<TacticalMapMode>(mode ?? "preventive");
  const activeMode = mode ?? internalMode;
  const handleModeChange = (newMode: TacticalMapMode) => {
    setInternalMode(newMode);
    onModeChange?.(newMode);
  };

  // Estados de aceleración gráfica WebGL y Clustering Inteligente
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [webglEnabled, setWebglEnabled] = useState(true);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [windFlowEnabled, setWindFlowEnabled] = useState(true);

  // Capas Avanzadas: Recursos Hídricos (Ríos/Lagunas), Zonas de Vegetación y Cisternas Sugeridas
  const [showWaterResources, setShowWaterResources] = useState(true);
  const [showVegetationZones, setShowVegetationZones] = useState(false);
  const [showSuggestedCisterns, setShowSuggestedCisterns] = useState(true);

  const latest = useRef({
    incidents,
    selectedId,
    center,
    zoom,
    layers,
    wind,
    gibsDates,
    onPoint,
    national,
    horizon,
    weather,
    currentZoom,
    clusteringEnabled,
    activeMode,
    showWaterResources,
    showVegetationZones,
    showSuggestedCisterns,
    selectedRegionId,
  });

  latest.current = {
    incidents,
    selectedId,
    center,
    zoom,
    layers,
    wind,
    gibsDates,
    onPoint,
    national,
    horizon,
    weather,
    currentZoom,
    clusteringEnabled,
    activeMode,
    showWaterResources,
    showVegetationZones,
    showSuggestedCisterns,
    selectedRegionId,
  };

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const onSelectRegionRef = useRef(onSelectRegion);
  onSelectRegionRef.current = onSelectRegion;

  // Cálculo de clústeres reactivo para WebGL y Leaflet
  const clusters = useMemo(() => {
    return clusteringEnabled && currentZoom <= 11
      ? clusterHotspots(incidents, currentZoom)
      : incidents.map((inc) => ({
          id: `single-${inc.id}`,
          lat: inc.lat,
          lng: inc.lng,
          totalHotspots: 1,
          harmonizedCount: inc.source === "MODIS+VIIRS armonizado" ? 1 : 0,
          maxFRP: inc.frp ?? 0,
          sumFRP: inc.frp ?? 0,
          maxTempKelvin: 300 + (inc.frp ?? 10) * 8.5,
          dominantRiskLevel: (inc.frp ?? 0) >= 30 ? ("CRITICO" as const) : ("ALTO" as const),
          hasRule30Risk: (inc.frp ?? 0) >= 30,
          hasExplosiveVegetation: false,
          hasProtectedVegetation: false,
          bounds: {
            minLat: inc.lat - 0.005,
            maxLat: inc.lat + 0.005,
            minLng: inc.lng - 0.005,
            maxLng: inc.lng + 0.005,
          },
          incidents: [inc],
          isSingleHotspot: true,
        }));
  }, [incidents, currentZoom, clusteringEnabled]);

  const harmonizedTotal = useMemo(() => {
    return incidents.filter((i) => i.source === "MODIS+VIIRS armonizado" || (i.confidence ?? 0) >= 90).length;
  }, [incidents]);

  const selectedIncident = useMemo(() => {
    return incidents.find((i) => i.id === selectedId);
  }, [incidents, selectedId]);

  const selectedForecast = useMemo(() => {
    if (!selectedIncident || selectedIncident.status === "Controlado") return null;
    return calculatePropagationForecast(selectedIncident.lat, selectedIncident.lng, wind.deg, wind.kmh);
  }, [selectedIncident, wind]);

  const nearestWaterSelected = useMemo(() => {
    if (!selectedIncident) return null;
    return findNearestWaterResource(selectedIncident.lat, selectedIncident.lng);
  }, [selectedIncident]);

  const whatsappUrl = useMemo(() => {
    if (!selectedIncident) return "";
    const waterText = nearestWaterSelected
      ? `💧 Fuente Agua: ${nearestWaterSelected.resource.name} (${nearestWaterSelected.resource.categoryLabel}) a ${nearestWaterSelected.distKm} km · ${nearestWaterSelected.resource.flowStatus}`
      : "";
    const forecastText = selectedForecast
      ? `💨 Viento y Propagación: Sopla a ${Math.round(wind.kmh)} km/h hacia ${selectedForecast.windCardinalTo} (${Math.round(selectedForecast.bearingTo)}°) · ROS: ~${selectedForecast.rateOfSpreadKmH} km/h` +
        (selectedForecast.threatenedCommunities.length > 0
          ? `\n⚠️ Comunidades Amenazadas: ${selectedForecast.threatenedCommunities.map((c) => `${c.name} (${c.distKm}km/ETA:${c.etaMin}min)`).join(", ")}`
          : "")
      : "";

    const text =
      `🚨 ALERTA TÁCTICA CENTINELA — INCENDIO FORESTAL COCHABAMBA\n` +
      `📍 Sector: ${selectedIncident.zone} (${selectedIncident.lat.toFixed(5)}, ${selectedIncident.lng.toFixed(5)})\n` +
      `🔥 Potencia Radiativa: ${selectedIncident.frp ?? "N/D"} MW (${classifyFrp(selectedIncident.frp).category})\n` +
      `📡 Detección: ${selectedIncident.source} · Confianza: ${selectedIncident.confidence ?? 95}%\n` +
      `${forecastText}\n` +
      `${waterText}\n` +
      `🚒 Acceso Terrestre: ETA aprox: ${selectedIncident.route?.etaMin ?? 25} min\n` +
      `🗺️ GPS: https://www.google.com/maps?q=${selectedIncident.lat.toFixed(5)},${selectedIncident.lng.toFixed(5)}\n` +
      `Solicitud de despacho UGR / Bomberos / SERNAP.`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }, [selectedIncident, nearestWaterSelected, selectedForecast, wind]);

  const [closedId, setClosedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId && selectedId !== closedId) {
      setClosedId(null);
    }
  }, [selectedId, closedId]);

  const isInspectorVisible = Boolean(
    selectedIncident && (!closedId || (closedId !== selectedIncident.id && closedId !== "all"))
  );

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then(async (mod) => {
      if (cancelled || !el.current || map.current) return;
      const lib = (mod as unknown as { default: typeof Leaflet }).default ?? mod;
      L.current = lib;
      (window as unknown as { L: typeof Leaflet }).L = lib;
      await import("leaflet.vectorgrid");
      if (cancelled || !el.current) return;

      map.current = lib
        .map(el.current, {
          zoomControl: false,
          attributionControl: true,
          zoomSnap: 0.5,
          zoomDelta: 0.5,
          wheelPxPerZoomLevel: 120,
        })
        .setView(center, zoom);
      basemap.current = lib
        .tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
          attribution: "Tiles © Esri · NASA · CENTINELA",
          maxZoom: 18,
        })
        .addTo(map.current);

      basemap.current.on("tileerror", () => setMapError("Una imagen Esri no cargó. Prueba la base oscura."));
      lib.control.scale({ imperial: false, metric: true, position: "bottomright" }).addTo(map.current);
      group.current = lib.layerGroup().addTo(map.current);
      satellites.current = lib.layerGroup().addTo(map.current);
      me.current = lib.layerGroup().addTo(map.current);
      routeLayer.current = lib.layerGroup().addTo(map.current);

      map.current.on("popupopen", (e: Leaflet.PopupEvent) => {
        const root = e.popup.getElement();
        root?.querySelectorAll<HTMLButtonElement>("button[data-route]").forEach((b) => {
          b.onclick = () =>
            void planRoute(b.dataset["route"] as "access" | "escape", Number(b.dataset["lat"]), Number(b.dataset["lng"]));
        });
      });

      map.current.on("click", (e: Leaflet.LeafletMouseEvent) => {
        setClosedId("all");
        onSelectRef.current?.("");
        // Registrar punto táctico para clima local sin interrumpir el viewport ni forzar re-centrado
        if (departmentAt(e.latlng.lat, e.latlng.lng)) {
          lastTarget.current = {
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            zoom: map.current?.getZoom() ?? zoom,
          };
          latest.current.onPoint?.([e.latlng.lat, e.latlng.lng]);
        }
      });

      map.current.on("zoomend", () => {
        if (map.current) {
          setCurrentZoom(map.current.getZoom());
        }
      });

      map.current.setView(latest.current.center, latest.current.zoom);
      setReady(true);
      draw();

      // Forzar cálculo de dimensiones iniciales para asegurar renderizado de tiles
      setTimeout(() => {
        map.current?.invalidateSize();
      }, 150);
      setTimeout(() => {
        map.current?.invalidateSize();
      }, 400);

      // ResizeObserver para mantener tiles e imágenes al cambiar layout o pantalla
      if (el.current && typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => {
          map.current?.invalidateSize();
        });
        ro.observe(el.current);
      }
    }).catch(() => setMapError("El mapa no pudo cargar. Los datos NASA siguen disponibles."));

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      satelliteKey.current = "";
      basemap.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reaccionar ÚNICAMENTE cuando el centro o zoom objetivo provisto externamente cambie (ej: usuario selecciona otro municipio en la cinta)
  // NUNCA interrumpir ni restablecer el zoom cuando el usuario navega, se acerca o hace zoom libremente en el mapa
  useEffect(() => {
    if (!ready || !map.current) return;
    const targetChanged =
      Math.abs(lastTarget.current.lat - center[0]) > 0.001 ||
      Math.abs(lastTarget.current.lng - center[1]) > 0.001 ||
      Math.abs(lastTarget.current.zoom - zoom) > 0.1;

    if (targetChanged) {
      lastTarget.current = { lat: center[0], lng: center[1], zoom };
      map.current.flyTo(center, zoom, {
        duration: 0.9,
        easeLinearity: 0.25,
      });
    }
  }, [center, zoom, ready]);

  function toggleLocate() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      me.current?.clearLayers();
      setLocating(false);
      myPos.current = null;
      return;
    }
    if (!navigator.geolocation) {
      setMapError("Tu dispositivo no tiene GPS disponible.");
      return;
    }
    setLocating(true);
    let first = true;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const lib = L.current;
        if (!lib || !me.current) return;
        me.current.clearLayers();
        const ll: [number, number] = [p.coords.latitude, p.coords.longitude];
        myPos.current = ll;
        lib.circle(ll, { radius: p.coords.accuracy, color: css("--primary"), weight: 1, fillOpacity: 0.08 }).addTo(me.current);
        lib
          .marker(ll, {
            icon: lib.divIcon({
              className: "",
              html: `<div class="fire-marker" style="width:16px;height:16px"><div class="ring"></div><div class="core" style="background:var(--primary)"></div></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
          })
          .bindPopup(
            `<b>Tu ubicación</b><br><span style="font-family:monospace">${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}</span><br><small>Precisión aprox. ${Math.round(p.coords.accuracy)} m</small>`
          )
          .addTo(me.current);
        if (first && map.current) {
          map.current.flyTo(ll, Math.max(map.current.getZoom(), 12));
          first = false;
        }
      },
      () => {
        setMapError("No fue posible obtener tu ubicación GPS.");
        setLocating(false);
        if (watchId.current != null) {
          navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }

  function getPosition(): Promise<[number, number]> {
    if (myPos.current) return Promise.resolve(myPos.current);
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error("sin GPS"));
      navigator.geolocation.getCurrentPosition(
        (p) => {
          myPos.current = [p.coords.latitude, p.coords.longitude];
          res(myPos.current);
        },
        rej,
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  }

  async function planRoute(kind: "access" | "escape", fLat: number, fLng: number) {
    const lib = L.current,
      layer = routeLayer.current;
    if (!lib || !layer) return;
    const request = ++routeRequest.current;
    layer.clearLayers();
    let from: [number, number], to: [number, number], label: string;
    if (kind === "access") {
      try {
        from = await getPosition();
      } catch {
        from = [-17.3935, -66.157];
      }
      to = [fLat, fLng];
      label = "Ruta de acceso táctico hacia el foco";
    } else {
      from = [fLat, fLng];
      const safe = REFERENCE_POINTS.map((p) => ({ p, d: Math.hypot(p.lat - fLat, p.lng - fLng) })).sort(
        (a, b) => a.d - b.d
      )[0]!;
      to = [safe.p.lat, safe.p.lng];
      label = `Ruta orientativa hacia ${safe.p.name}`;
    }
    setRouteInfo("Calculando ruta por caminos reales…");
    try {
      const r = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`,
        { signal: AbortSignal.timeout(15000) }
      );
      const j = await r.json();
      const route = j.routes?.[0];
      if (!r.ok || !route || !Number.isFinite(route.distance) || !Array.isArray(route.geometry?.coordinates))
        throw new Error();
      if (request !== routeRequest.current) return;
      layer.clearLayers();
      const coords = (route.geometry.coordinates as [number, number][]).map(([x, y]) => [y, x] as [number, number]);
      const color = css(kind === "escape" ? "--success" : "--primary");
      lib.polyline(coords, { color, weight: 8, opacity: 0.3 }).addTo(layer);
      lib.polyline(coords, { color, weight: 4, dashArray: kind === "escape" ? "8 6" : undefined }).addTo(layer);
      lib.circleMarker(to, { radius: 7, color, fillOpacity: 0.9 }).addTo(layer);
      map.current?.closePopup();
      map.current?.fitBounds(lib.latLngBounds(coords), { paddingTopLeft: [20, 60], paddingBottomRight: [60, 200] });
      const km = (route.distance / 1000).toFixed(1),
        min = Math.round(route.duration / 60);
      const gmaps = `https://www.google.com/maps/dir/?api=1&origin=${from[0]},${from[1]}&destination=${to[0]},${to[1]}&travelmode=driving`;
      setRouteInfo(`${label}: ${km} km · ~${min} min en vehículo.|${gmaps}`);
    } catch {
      if (request !== routeRequest.current) return;
      setRouteInfo("No se pudo calcular la ruta ahora.");
    }
  }

  useEffect(() => () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  useEffect(() => {
    basemap.current?.setUrl(
      base === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    );
  }, [base]);

  useEffect(() => {
    draw();
  }, [
    ready,
    incidents,
    selectedId,
    layers,
    gibsDates,
    national,
    horizon,
    weather,
    routeInfo,
    currentZoom,
    clusteringEnabled,
    activeMode,
    showWaterResources,
    showVegetationZones,
    showSuggestedCisterns,
    selectedRegionId,
  ]);

  function draw() {
    const lib = L.current,
      g = group.current;
    if (!lib || !g) return;
    const {
      incidents,
      selectedId,
      layers,
      gibsDates,
      national,
      horizon,
      weather,
      activeMode,
      showWaterResources,
      showVegetationZones,
      showSuggestedCisterns,
      selectedRegionId,
    } = latest.current;
    g.clearLayers();
    const success = css("--success"),
      primary = css("--primary"),
      fire = css("--fire"),
      warn = css("--warning");

    const key = JSON.stringify([layers.viirs, layers.modis, layers.viirsThermal, gibsDates]);
    if (key !== satelliteKey.current && satellites.current) {
      satelliteKey.current = key;
      satellites.current.clearLayers();
      setMapError("");
      const errors = () => setMapError("Una capa NASA no pudo cargar; se mantiene el mapa táctico.");
      if (layers.viirs && gibsDates?.viirs)
        lib
          .tileLayer(gibsUrl("viirs", gibsDates.viirs), {
            maxNativeZoom: 9,
            maxZoom: 16,
            attribution: "NASA GIBS · VIIRS",
          })
          .on("tileerror", errors)
          .addTo(satellites.current);
      for (const thermal of ["modis", "viirsThermal"] as const) {
        const date = gibsDates?.[thermal];
        if (!layers[thermal] || !date) continue;
        const vg = lib as typeof Leaflet & { vectorGrid: { protobuf: (url: string, options: object) => Leaflet.GridLayer } };
        const style = { radius: 4, color: fire, fillColor: fire, fill: true, fillOpacity: 0.9, weight: 1 };
        vg.vectorGrid
          .protobuf(gibsUrl(thermal, date), {
            maxNativeZoom: thermal === "modis" ? 7 : 8,
            maxZoom: 18,
            interactive: false,
            attribution: `NASA GIBS · ${thermal === "modis" ? "MODIS" : "VIIRS SNPP"}`,
            vectorTileLayerStyles: new Proxy({}, { get: () => style }),
          })
          .on("tileerror", errors)
          .addTo(satellites.current);
      }
    }

    // ============================================================
    // DEMARCACIÓN CARTOGRÁFICA VECTORIAL COMPLETA
    // ============================================================
    // 1. Contorno Nacional de Bolivia y Departamentos limítrofes
    lib.geoJSON(boundaries as GeoJsonObject, {
      filter: (feature: any) => feature.properties?.name !== "Cochabamba",
      style: {
        color: "#94A3B8",
        weight: 2,
        dashArray: "4, 4",
        fillOpacity: 0.02,
      },
    }).addTo(g);

    // 2. Perímetro Completo del Departamento de Cochabamba (Borde Cian Neón de alto contraste)
    const cochabambaFeature = (boundaries as any).features?.find(
      (f: any) => f.properties?.name === "Cochabamba"
    );
    if (cochabambaFeature) {
      lib
        .geoJSON(cochabambaFeature as GeoJsonObject, {
          style: {
            color: "#00E5FF",
            weight: 3.5,
            fillColor: "#00E5FF",
            fillOpacity: 0.06,
          },
        })
        .bindTooltip("DEPARTAMENTO DE COCHABAMBA", { direction: "center" })
        .addTo(g);
    }

    // 3. Polígono de Protección Oficial del Parque Nacional Tunari (SERNAP)
    lib
      .polygon(TUNARI_BOUNDARY, {
        color: "#10B981",
        weight: 2.5,
        fillColor: "#10B981",
        fillOpacity: 0.06,
        dashArray: "6, 6",
      })
      .bindTooltip("PARQUE NACIONAL TUNARI (ÁREA PROTEGIDA SERNAP)", {
        permanent: true,
        direction: "top",
        className: "bg-slate-950/90 text-emerald-400 font-bold border border-emerald-500/50 rounded px-2 py-0.5 text-xs shadow-lg",
      })
      .addTo(g);

    // 4. Límites Poligonales de los 11 Municipios / Provincias de Cochabamba
    COCHABAMBA_MUNICIPALITIES_POLYGONS.forEach((m) => {
      const isSelected = selectedRegionId === m.id;
      lib
        .polygon(m.polygon, {
          color: isSelected ? "#FFD700" : "#F59E0B",
          weight: isSelected ? 3.5 : 1.8,
          opacity: isSelected ? 1 : 0.75,
          fillColor: isSelected ? "#FFD700" : "#F59E0B",
          fillOpacity: isSelected ? 0.16 : 0.05,
          dashArray: isSelected ? undefined : "4 4",
        })
        .on("click", (e: Leaflet.LeafletMouseEvent) => {
          lib.DomEvent.stopPropagation(e);
          onSelectRegionRef.current?.(m.id);
        })
        .bindTooltip(`${m.name} (Prov. ${m.province})`, { direction: "center" })
        .addTo(g);
    });

    // 5. Anti-Colisión de Etiquetas Cartográficas por Nivel de Zoom
    if (currentZoom <= 7) {
      // Zoom Macro (<=7): Solo Estado Plurinacional de Bolivia y Departamento de Cochabamba
      const boliviaIcon = lib.divIcon({
        className: "",
        html: `<div class="bg-slate-950/90 border border-slate-600 text-white font-extrabold px-2.5 py-1 rounded text-xs shadow-lg flex items-center gap-1 backdrop-blur-sm tracking-widest pointer-events-none whitespace-nowrap">
          ESTADO PLURINACIONAL DE BOLIVIA
        </div>`,
        iconAnchor: [120, 15],
      });
      lib.marker([-16.5, -64.5], { icon: boliviaIcon, interactive: false }).addTo(g);

      const cochaIcon = lib.divIcon({
        className: "",
        html: `<div class="bg-slate-950/90 border border-cyan-400 text-cyan-300 font-extrabold px-2.5 py-1 rounded text-xs shadow-lg flex items-center gap-1 backdrop-blur-sm tracking-wide pointer-events-none whitespace-nowrap">
          DEPARTAMENTO DE COCHABAMBA
        </div>`,
        iconAnchor: [90, 15],
      });
      lib.marker([-17.35, -65.85], { icon: cochaIcon, interactive: false }).addTo(g);
    } else {
      // Zoom >= 8: Etiquetas municipales filtradas por minZoom (Quillacollo y Colcapirhua no colisionan)
      CARTOGRAPHIC_LABELS.forEach((cl) => {
        if (currentZoom < cl.minZoom) return;
        const isSelected = selectedRegionId === cl.id;
        const labelIcon = lib.divIcon({
          className: "",
          html: `<div class="bg-slate-950/90 border ${
            isSelected
              ? "border-amber-400 text-amber-300 ring-2 ring-amber-400/50 font-black"
              : "border-cyan-500/40 text-slate-200 font-bold"
          } px-2 py-0.5 rounded text-[11px] shadow-md pointer-events-none whitespace-nowrap flex items-center gap-1 backdrop-blur-sm">
            ${cl.label}
          </div>`,
          iconAnchor: [50, 12],
        });
        lib.marker([cl.lat, cl.lng], { icon: labelIcon, interactive: false }).addTo(g);
      });
    }

    // ============================================================
    // NIVEL 1: POLÍGONOS DE ALERTA PREVENTIVA — REGLA 30-30-30 (AÚN SIN FUEGO)
    // ============================================================
    PREVENTIVE_30_ZONES.forEach((z) => {
      lib
        .polygon(z.polygon, {
          color: "#f59e0b",
          weight: activeMode === "preventive" ? 2.5 : 1.5,
          fillColor: "#f59e0b",
          fillOpacity: activeMode === "preventive" ? 0.24 : 0.08,
          dashArray: "5 4",
        })
        .bindTooltip(
          `🛡️ ZONA DE ALERTA PREVENTIVA — AÚN SIN FUEGO\n` +
          `Sector: ${z.name} (${z.municipality})\n` +
          `Condición: Regla 30-30-30 Activa (${z.tempC}°C · ${z.windKmh}km/h · ${z.rhPct}% HR)\n` +
          `Combustible: ${z.fuelType}\n` +
          `¡Peligro Crítico de Chispa! Biomasa seca. Prohibido quemar / Enviar patrulla preventiva SERNAP`,
          { direction: "top" }
        )
        .addTo(g);
    });

    // ============================================================
    // RUTAS DE PATRULLAJE PREVENTIVO SERNAP Y BRECHAS CORTAFUEGOS
    // ============================================================
    EVAC_ROUTES.forEach((r) => {
      const isPrev = activeMode === "preventive";
      const col = r.state === "Habilitada" ? (isPrev ? "#10b981" : "#0ea5e9") : r.state === "4x4 / Tierra" ? "#f59e0b" : "#ef4444";
      lib
        .polyline(r.points, { color: col, weight: isPrev ? 3.5 : 2.5, dashArray: r.state === "Habilitada" ? undefined : "5 5" })
        .bindTooltip(
          isPrev
            ? `🛡️ Ruta de Patrullaje Preventivo SERNAP / Cuadrillas: ${r.name} (${r.state})`
            : `🛣️ Brecha Cortafuegos / Despacho: ${r.name} (${r.state})`
        )
        .addTo(g);
    });

    // ============================================================
    // NIVEL 4: CISTERNAS MUNICIPALES GAMC / SEMAPA EN APRESTO
    // ============================================================
    const isMacroZoom = currentZoom <= 11;

    NODES.forEach((n) => {
      const cp = n.cisternPoint;
      const cSize = isMacroZoom ? 20 : 26;
      const cIcon = lib.divIcon({
        className: "",
        html: `<div style="background:#0284c7;color:#fff;border:2px solid #38bdf8;border-radius:50%;width:${cSize}px;height:${cSize}px;display:flex;align-items:center;justify-content:center;font-size:${isMacroZoom ? 10 : 13}px;box-shadow:0 0 10px #0284c7">🚒</div>`,
        iconSize: [cSize, cSize],
        iconAnchor: [cSize / 2, cSize / 2],
      });
      lib.marker([cp.lat, cp.lng], { icon: cIcon }).bindPopup(buildCisternPopupHtml(cp)).addTo(g);

      if (activeMode === "preventive") {
        lib
          .circle([cp.lat, cp.lng], {
            radius: 5000,
            color: "#0284c7",
            weight: 1,
            dashArray: "4 4",
            fillColor: "#0284c7",
            fillOpacity: 0.04,
          })
          .bindTooltip(`Radio de Cobertura Rápida Cisterna GAMC: ${cp.name} (5 km)`)
          .addTo(g);
      }
    });

    // Puntos de Riesgo Antrópico / Cotas Altas (>3200m)
    HUMAN_RISK_POINTS.forEach((hr) => {
      const hrSize = isMacroZoom ? 16 : 20;
      const hrIcon = lib.divIcon({
        className: "",
        html: `<div style="background:#ea580c;color:#fff;border:2px solid #fff;border-radius:50%;width:${hrSize}px;height:${hrSize}px;display:flex;align-items:center;justify-content:center;font-size:${isMacroZoom ? 8 : 10}px;box-shadow:0 0 6px #ea580c">⚠️</div>`,
        iconSize: [hrSize, hrSize],
        iconAnchor: [hrSize / 2, hrSize / 2],
      });
      lib.marker([hr.lat, hr.lng], { icon: hrIcon }).bindPopup(buildHumanRiskPopupHtml(hr)).addTo(g);
    });

    // ============================================================
    // MÓDULO 1: RECURSOS HÍDRICOS (RÍOS, RIACHUELOS, LAGUNAS, TANQUES)
    // ============================================================
    if (showWaterResources) {
      WATER_RESOURCES.forEach((w) => {
        const iconBg = w.type === "rio" ? "#0284c7" : w.type === "laguna" ? "#0d9488" : "#0369a1";
        const iconSymbol = w.type === "rio" ? "🌊" : w.type === "laguna" ? "🏞️" : "🚰";
        const wSize = isMacroZoom ? 18 : 24;
        const wIcon = lib.divIcon({
          className: "",
          html: `<div style="background:${iconBg};color:#fff;border:2px solid #38bdf8;border-radius:50%;width:${wSize}px;height:${wSize}px;display:flex;align-items:center;justify-content:center;font-size:${isMacroZoom ? 9 : 12}px;box-shadow:0 0 8px #0284c7">
            ${iconSymbol}
          </div>`,
          iconSize: [wSize, wSize],
          iconAnchor: [wSize / 2, wSize / 2],
        });
        lib
          .marker([w.lat, w.lng], { icon: wIcon })
          .bindPopup(
            `<div style="font-family:sans-serif;font-size:12px;line-height:1.4;color:#0f172a">
              <div style="font-weight:bold;color:#0369a1;font-size:13px">${iconSymbol} ${w.name}</div>
              <div style="color:#64748b;font-size:11px">${w.categoryLabel} · ${w.municipality}</div>
              <hr style="margin:4px 0;border:0;border-top:1px solid #e2e8f0"/>
              <div><strong>Cota:</strong> ${w.altitudeM} msnm</div>
              <div><strong>Capacidad / Caudal:</strong> ${w.capacityOrFlow}</div>
              <div style="color:#0284c7;font-weight:bold;margin-top:2px">● ${w.flowStatus}</div>
            </div>`
          )
          .bindTooltip(`💧 ${w.name} (${w.capacityOrFlow})`)
          .addTo(g);
      });
    }

    // ============================================================
    // MÓDULO 3: POLÍGONOS DE VEGETACIÓN E INFLAMABILIDAD (TRIÁNGULO DEL FUEGO)
    // ============================================================
    if (showVegetationZones) {
      VEGETATION_ZONES.forEach((vz) => {
        const polyCol =
          vz.fuelClassification === "Combustible Extremo (1.35x)"
            ? "#d97706"
            : vz.fuelClassification === "Combustible Muy Alto (1.25x)"
            ? "#eab308"
            : vz.fuelClassification === "Prioridad Conservación SERNAP"
            ? "#10b981"
            : "#84cc16";

        lib
          .polygon(vz.polygon, {
            color: polyCol,
            weight: 2,
            fillColor: polyCol,
            fillOpacity: 0.18,
            dashArray: vz.isProtected ? "6 3" : undefined,
          })
          .bindTooltip(
            `🌲 ${vz.name}\n` +
            `Clasificación: ${vz.fuelClassification}\n` +
            `Especies: ${vz.dominantSpecies}\n` +
            `Cota: ${vz.elevationRange}\n` +
            `Comportamiento: ${vz.fireBehavior}` +
            (vz.isProtected ? `\n⚠️ ¡ÁREA PROTEGIDA SERNAP - MÁXIMA PRIORIDAD DE CONSERVACIÓN!` : ""),
            { direction: "top" }
          )
          .addTo(g);
      });
    }

    // ============================================================
    // MÓDULO 2: ZONAS DE RECURRENCIA CRÍTICA Y CISTERNAS SUGERIDAS
    // ============================================================
    if (showSuggestedCisterns) {
      RECURRENCE_CLUSTERS.forEach((rc) => {
        // Polígono de recurrencia crítica
        lib
          .polygon(rc.polygon, {
            color: "#f43f5e",
            weight: 2.5,
            dashArray: "6 4",
            fillColor: "#f43f5e",
            fillOpacity: 0.15,
          })
          .bindTooltip(
            `🎯 ZONA DE RECURRENCIA CRÍTICA (ALTA FRECUENCIA DE FOCOS)\n` +
            `Sector: ${rc.name} (${rc.municipality})\n` +
            `Focos Históricos: ${rc.hotspotsCount} | FRP Promedio: ${rc.averageFRP} MW\n` +
            `${rc.reason}`,
            { direction: "top" }
          )
          .addTo(g);

        // Marcador inteligente de Pre-Posicionamiento de Cisterna
        const sc = rc.suggestedCistern;
        const cisIcon = lib.divIcon({
          className: "",
          html: `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer">
            <div style="position:absolute;inset:0;border-radius:50%;border:2px solid #ffd700;box-shadow:0 0 12px #ffd700;animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;opacity:0.7"></div>
            <div style="background:#0284c7;color:#fff;border:2px solid #ffd700;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 10px #ffd700">
              🚛
            </div>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        lib
          .marker([sc.lat, sc.lng], { icon: cisIcon })
          .bindPopup(
            `<div style="font-family:sans-serif;font-size:12px;line-height:1.4;color:#0f172a;max-width:280px">
              <div style="font-weight:bold;color:#b45309;font-size:13px">🚛💧 INSTALAR CISTERNA PREVENTIVA AQUÍ</div>
              <div style="font-weight:bold;color:#0369a1;margin-top:2px">${sc.name} (${rc.municipality})</div>
              <hr style="margin:4px 0;border:0;border-top:1px solid #e2e8f0"/>
              <div><strong>Capacidad Recomendada:</strong> ${sc.capacityLiters.toLocaleString()} L</div>
              <div><strong>Acceso Vial:</strong> ${sc.roadAccess}</div>
              <div style="background:#fef3c7;border:1px solid #fde68a;padding:6px;border-radius:4px;margin-top:6px;color:#92400e;font-size:11px">
                ${sc.impactAdvice}
              </div>
            </div>`
          )
          .bindTooltip(`🚛 Punto Sugerido para Cisterna: ${sc.name} (Reducción de 35 a 6 min)`)
          .addTo(g);
      });
    }

    // RENDERIZADO DE FOCOS: CLUSTERING EN ZOOM MACRO (<=11) Y DETALLE INDIVIDUAL EN ZOOM TÁCTICO (>=12)
    if (layers.thermal) {
      if (clusteringEnabled && currentZoom <= 11) {
        // MODO CLÚSTERES TÉRMICOS INTELIGENTES
        for (const c of clusters) {
          if (!c.isSingleHotspot && c.totalHotspots > 1) {
            const isCrit = c.dominantRiskLevel === "CRITICO";
            const isHarm = c.harmonizedCount > 0;
            const ringColor = isCrit ? "#ef4444" : isHarm ? "#06b6d4" : "#f59e0b";
            const bgCore = isCrit ? "rgba(239,68,68,0.92)" : isHarm ? "rgba(6,182,212,0.9)" : "rgba(245,158,11,0.9)";
            const clusterSize = Math.min(52, Math.max(30, c.totalHotspots * 2.5 + 24));
            const clusterMuni = c.incidents[0]?.zone?.replace("Parque N. ", "")?.split(" · ")[0] ?? "Tunari";

            const clusterIcon = lib.divIcon({
              className: "",
              html: `<div style="position:relative;width:${clusterSize}px;height:${clusterSize}px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer">
                <div style="position:absolute;inset:0;border-radius:50%;border:2px solid ${ringColor};box-shadow:0 0 14px ${ringColor};animation:fire-pulse 2s infinite"></div>
                <div style="background:${bgCore};color:#fff;border-radius:50%;width:${clusterSize - 8}px;height:${clusterSize - 8}px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;font-weight:bold;font-size:11px;line-height:1;box-shadow:0 0 8px rgba(0,0,0,0.5)">
                  <span>${c.totalHotspots}</span>
                  <span style="font-size:8px;opacity:0.9">${Math.round(c.sumFRP)}MW</span>
                </div>
                <div style="position:absolute;top:100%;margin-top:2px;background:rgba(3,7,18,0.92);border:1px solid ${ringColor};border-radius:4px;padding:1px 5px;font-size:9px;font-weight:bold;color:#fff;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.7);pointer-events:none">
                  📍 ${clusterMuni}
                </div>
              </div>`,
              iconSize: [clusterSize, clusterSize + 16],
              iconAnchor: [clusterSize / 2, clusterSize / 2],
            });

            lib
              .marker([c.lat, c.lng], { icon: clusterIcon })
              .bindTooltip(
                `🔥 Clúster ${c.totalHotspots} FIRMS (${clusterMuni}) | FRP Acum.: ${c.sumFRP} MW | Clic para acercar`,
                { direction: "top" }
              )
              .on("click", (e: Leaflet.LeafletMouseEvent) => {
                lib.DomEvent.stopPropagation(e);
                map.current?.flyToBounds(
                  [
                    [c.bounds.minLat, c.bounds.minLng],
                    [c.bounds.maxLat, c.bounds.maxLng],
                  ],
                  { padding: [60, 60], maxZoom: 13, duration: 1.0 }
                );
              })
              .addTo(g);
          } else {
            // Hotspot individual dentro del modo cluster
            renderSingleIncidentMarker(c.incidents[0]!, lib, g, success, primary, fire, warn);
          }
        }
      } else {
        // MODO TÁCTICO INDIVIDUAL (ZOOM >= 12 O CLUSTERING DESACTIVADO)
        incidents.forEach((i) => {
          renderSingleIncidentMarker(i, lib, g, success, primary, fire, warn);
        });
      }
    }

    if (national) {
      REFERENCE_POINTS.forEach((p) =>
        lib
          .circleMarker([p.lat, p.lng], {
            radius: p.kind === "área" ? 4 : 3,
            color: p.kind === "área" ? success : primary,
            fillOpacity: 0.6,
            weight: 1,
          })
          .bindTooltip(`${p.name} · referencia`)
          .addTo(g)
      );
    }
  }

  function renderSingleIncidentMarker(
    i: Incident,
    lib: typeof Leaflet,
    g: Leaflet.LayerGroup,
    success: string,
    primary: string,
    fire: string,
    warn: string
  ) {
    const isHarmonized = i.source === "MODIS+VIIRS armonizado";
    const frpData = classifyFrp(i.frp);
    const isEarly = (i.frp ?? 0) < 8 && i.status !== "Activo";

    // 1. Proyección a sotavento / horizonte configurado
    if (i.status !== "Controlado" && i.id === selectedId && horizon && weather) {
      lib
        .polygon(projectFire(i.lat, i.lng, weather, horizon).polygon, {
          color: warn,
          weight: 2,
          dashArray: "5 5",
          fillColor: fire,
          fillOpacity: 0.25,
        })
        .bindTooltip(`Escenario ${horizon}h a sotavento`)
        .addTo(g);
    }

    // 2. Modelo Físico Preciso de Propagación a Sotavento (30 min, 1 hora, 2 horas) + Vector de Viento
    if (i.status !== "Controlado") {
      const forecast = calculatePropagationForecast(i.lat, i.lng, wind.deg, wind.kmh);
      const isSel = i.id === selectedId;

      // Horizonte 2 Horas: Zona de Evacuación y Alerta Preventiva
      lib
        .polygon(forecast.cone2Hours, {
          color: "#eab308",
          weight: isSel ? 2 : 1,
          dashArray: "5 5",
          fillColor: "#eab308",
          fillOpacity: isSel ? 0.12 : 0.05,
        })
        .bindTooltip(
          `⏱️ Horizonte 2h (+${(forecast.rateOfSpreadKmH * 2).toFixed(1)} km) hacia ${forecast.windCardinalTo} (${Math.round(forecast.bearingTo)}°)`,
          { direction: "top" }
        )
        .addTo(g);

      // Horizonte 1 Hora: Línea de Defensa Táctica y Brechas Cortafuegos
      lib
        .polygon(forecast.cone1Hour, {
          color: "#f97316",
          weight: isSel ? 2.5 : 1.2,
          dashArray: "4 4",
          fillColor: "#f97316",
          fillOpacity: isSel ? 0.22 : 0.08,
        })
        .bindTooltip(
          `⏱️ Horizonte 1h (+${forecast.rateOfSpreadKmH.toFixed(1)} km) | Alerta Táctica SERNAP / Bomberos`,
          { direction: "top" }
        )
        .addTo(g);

      // Horizonte 30 Minutos: Frente de Fuego Activo / Ataque Rápido
      lib
        .polygon(forecast.cone30Min, {
          color: "#ef4444",
          weight: isSel ? 3 : 1.5,
          fillColor: "#ef4444",
          fillOpacity: isSel ? 0.35 : 0.15,
        })
        .bindTooltip(
          `🔥 Frente 30min (+${(forecast.rateOfSpreadKmH * 0.5).toFixed(1)} km) | ROS: ${forecast.rateOfSpreadKmH} km/h por viento de ${Math.round(wind.kmh)} km/h`,
          { direction: "top" }
        )
        .addTo(g);

      // Eje Vectorial Central de Viento (Halo oscuro + Trazo Neón Ámbar)
      lib.polyline(forecast.centralVector, {
        color: "#000000",
        weight: isSel ? 6 : 4,
        opacity: 0.85,
      }).addTo(g);

      lib.polyline(forecast.centralVector, {
        color: "#fbbf24",
        weight: isSel ? 3 : 2,
        opacity: 1,
      }).bindTooltip(
        `💨 Eje de Viento: Hacia ${forecast.windCardinalTo} (${Math.round(forecast.bearingTo)}°) a ${Math.round(wind.kmh)} km/h`,
        { direction: "center" }
      ).addTo(g);

      // Punta de flecha direccional en el extremo
      const arrowIcon = lib.divIcon({
        className: "",
        html: `<div style="background:#fbbf24;color:#000;font-weight:900;border:1.5px solid #000;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;box-shadow:0 0 8px #fbbf24;transform:rotate(${forecast.bearingTo - 90}deg)">➔</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      lib.marker(forecast.endPoint2H, { icon: arrowIcon, interactive: false }).addTo(g);

      // Comunidades Amenazadas en Trayectoria Directa
      if (isSel && forecast.threatenedCommunities.length > 0) {
        forecast.threatenedCommunities.forEach((comm) => {
          lib
            .circleMarker([comm.lat, comm.lng], {
              radius: 6,
              color: "#f43f5e",
              fillColor: "#f43f5e",
              fillOpacity: 0.9,
              weight: 2,
            })
            .bindTooltip(`⚠️ AMENAZA EN TRAYECTORIA: ${comm.name} (${comm.distKm} km · ETA: ~${comm.etaMin} min)`, {
              permanent: true,
              direction: "top",
              className: "bg-red-950 text-red-200 border border-red-500 font-bold px-2 py-0.5 text-[10px] rounded shadow-lg",
            })
            .addTo(g);
        });
      }
    }

    // 3. MÓDULO 1: DOBLE RUTEO DE ALTO CONTRASTE (RUTA A ACCESO + RUTA B AGUA)
    let closestCistern = NODES[0]!.cisternPoint;
    let minCisternDist = Infinity;
    for (const node of NODES) {
      const d = Math.hypot(node.cisternPoint.lat - i.lat, node.cisternPoint.lng - i.lng);
      if (d < minCisternDist) {
        minCisternDist = d;
        closestCistern = node.cisternPoint;
      }
    }
    const distKm = (minCisternDist * 111).toFixed(1);

    if (i.id === selectedId) {
      // RUTA A — Vía de Acceso Terrestre al Foco (Brigadas / Carros Bomberos)
      // Halo oscuro de contraste extremo para mapa satelital
      lib
        .polyline([[closestCistern.lat, closestCistern.lng], [i.lat, i.lng]], {
          color: "#000000",
          weight: 9,
          opacity: 0.92,
        })
        .addTo(g);

      // Trazo principal Oro / Ámbar Neón (#FFD700)
      lib
        .polyline([[closestCistern.lat, closestCistern.lng], [i.lat, i.lng]], {
          color: "#FFD700",
          weight: 5,
          opacity: 1,
        })
        .bindTooltip(
          `🚒 RUTA DE ACCESO: ${i.route.distKm ?? distKm} km | ETA: ${i.route.etaMin ?? 25} min | ${i.route.state ?? "Vía Habilitada"}`,
          { permanent: true, direction: "center" }
        )
        .addTo(g);

      // RUTA B — Vía de Extracción y Abastecimiento de Agua (Hidrantes + Ríos + Riachuelos)
      const nearestWater = findNearestWaterResource(i.lat, i.lng);
      // Halo cian profundo
      lib
        .polyline([[nearestWater.resource.lat, nearestWater.resource.lng], [i.lat, i.lng]], {
          color: "#004754",
          weight: 7,
          opacity: 0.85,
        })
        .addTo(g);

      // Trazo animado discontinuo Cian Fluorescente (#00E5FF)
      lib
        .polyline([[nearestWater.resource.lat, nearestWater.resource.lng], [i.lat, i.lng]], {
          color: "#00E5FF",
          weight: 4,
          dashArray: "10, 8",
          opacity: 0.98,
        })
        .bindTooltip(
          `💧 RUTA DE AGUA: ${nearestWater.resource.name} a ${nearestWater.distKm} km (${nearestWater.resource.flowStatus})`,
          { permanent: true, direction: "top" }
        )
        .addTo(g);
    }

    // 4. Marcadores Diferenciados: Nivel 2 (Anomalía Naranja) vs Nivel 3 (Foco Rojo Neón)
    const size = Math.round((isHarmonized ? 16 : 11) + Math.min(i.frp ?? 10, 60) / 2.2);
    const ringBorder = isEarly
      ? "border: 2px solid #f97316; box-shadow: 0 0 10px #f97316;"
      : isHarmonized
      ? `border: 2px solid ${primary}; box-shadow: 0 0 14px ${primary};`
      : "";

    const coreColor = i.status === "Controlado"
      ? success
      : isEarly
      ? "#f97316"
      : isHarmonized
      ? primary
      : fire;

    const icon = lib.divIcon({
      className: "",
      html: `<div class="fire-marker" style="width:${size}px;height:${size}px;opacity:${0.6 + (i.confidence ?? 70) / 200}">
        ${i.status === "Controlado" ? "" : `<div class="ring" style="${ringBorder}"></div>`}
        <div class="core" style="background:${coreColor};${
          i.status === "Controlado" ? "box-shadow:none" : isHarmonized ? `box-shadow:0 0 10px ${primary}` : isEarly ? "box-shadow:0 0 8px #f97316" : ""
        }${i.id === selectedId ? `;outline:2px solid ${primary};outline-offset:3px` : ""}"></div>
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

    const near = nearestReference(i.lat, i.lng, "comunidad");

    const popupTitle = isEarly
      ? "🌡️ ANOMALÍA TÉRMICA INICIAL (&lt; 300°C)"
      : isHarmonized
      ? "🔥 FOCO CONFIRMADO (MODIS+VIIRS 375m)"
      : "🔥 DETECCIÓN SATELITAL ACTIVA";

    const popupColor = isEarly ? "#f97316" : isHarmonized ? "var(--primary)" : "#ef4444";

    const popup = `<div style="max-width:260px;font-size:11px;line-height:1.35;font-family:sans-serif">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;gap:4px">
        <b style="color:${popupColor};font-size:10.5px;white-space:nowrap">${popupTitle}</b>
        <span style="font-size:9px;padding:1px 4px;border-radius:3px;background:var(--muted);font-family:monospace;white-space:nowrap">${escapeMapText(
          i.source
        )}</span>
      </div>
      <div style="font-size:10px;color:var(--muted-foreground);margin-bottom:3px">
        ${escapeMapText(formatDateTime(i.date))} · <span style="font-family:monospace">${i.lat.toFixed(4)}, ${i.lng.toFixed(4)}</span>
      </div>
      <div style="font-size:10px;margin-bottom:4px;padding:3px 5px;border-radius:3px;background:rgba(255,255,255,0.05);color:${isEarly ? '#f97316' : '#ef4444'}">
        ${isEarly ? 'Calor anormal detectado antes de incendio forestal mayor. Requiere inspección rápida.' : 'Foco activo confirmado con alta energía radiativa. Despacho táctico requerido.'}
      </div>
      <div style="margin:3px 0;padding:4px 6px;border-radius:4px;background:rgba(255,255,255,0.06);border-left:3px solid ${popupColor}">
        <div><b>FRP:</b> ${i.frp ?? "N/D"} MW · <b>${escapeMapText(frpData.category)}</b></div>
        <div><b>Confianza:</b> ${i.confidence ?? "N/D"}% · <b>Agua requerida:</b> ~${frpData.recommendedWaterLiters} L</div>
        <div style="font-size:10px;color:var(--muted-foreground);margin-top:2px">Ref: ${escapeMapText(near?.name ?? "N/D")} (${near ? near.km.toFixed(1) : "?"} km)</div>
        <div style="font-size:10px;color:#38bdf8;margin-top:2px">🚒 Cisterna: ${escapeMapText(closestCistern.name)} (${distKm} km · Transitable)</div>
      </div>
      <div style="display:flex;gap:4px;margin-top:5px">
        <button data-route="access" data-lat="${i.lat}" data-lng="${
      i.lng
    }" style="flex:1;min-height:30px;padding:3px 4px;font-size:10px;border-radius:4px;background:var(--primary);color:var(--primary-foreground);font-weight:700;border:none;cursor:pointer">🚒 Bomberos</button>
        <button data-route="escape" data-lat="${i.lat}" data-lng="${
      i.lng
    }" style="flex:1;min-height:30px;padding:3px 4px;font-size:10px;border-radius:4px;background:var(--success);color:var(--background);font-weight:700;border:none;cursor:pointer">🏃 Escape</button>
      </div>
    </div>`;

    const marker = lib
      .marker([i.lat, i.lng], { icon })
      .bindPopup(popup, {
        maxWidth: 270,
        autoPan: false,
        autoPanPaddingTopLeft: [10, 60],
        autoPanPaddingBottomRight: [10, 50],
      })
      .bindTooltip(
        isEarly
          ? `🌡️ Nivel 2: Anomalía Térmica Inicial (<300°C) | Zona: ${i.zone} | Calor superficial detectado antes de incendio mayor | FRP: ${i.frp ?? "N/D"} MW | Requiere inspección rápida de cuadrilla`
          : isHarmonized
          ? `🔥 Nivel 3: Foco Confirmado — Fusión MODIS+VIIRS 375m | Zona: ${i.zone} | FRP: ${i.frp ?? "N/D"} MW · ${frpData.category} | Agua requerida: ~${frpData.recommendedWaterLiters} L`
          : `🔥 Nivel 3: Foco Activo Detectado (${i.source}) | Zona: ${i.zone} | FRP: ${i.frp ?? "N/D"} MW | Agua estimada: ~${frpData.recommendedWaterLiters} L`,
        { direction: "top" }
      )
      .on("click", (e: Leaflet.LeafletMouseEvent) => {
        lib.DomEvent.stopPropagation(e);
        setClosedId(null);
        onSelectRef.current?.(i.id);
      })
      .addTo(g);
  }

  return (
    <div className="flex flex-col w-full h-full min-h-[580px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* ============================================================ */}
      {/* BARRA DE CONTROL TÁCTICA DEDICADA ENCIMA DEL LIENZO          */}
      {/* Cero superposición de botones + diseño de alto nivel C2      */}
      {/* ============================================================ */}
      <div className="bg-slate-900/95 border-b border-slate-800 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 z-10 shrink-0">
        {/* Controles de Capas y Modos Rápidos */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Selector de Mapa Base */}
          <div className="flex items-center rounded-lg bg-slate-800/80 p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setBase("satellite")}
              className={`px-2 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition-colors cursor-pointer ${
                base === "satellite" ? "bg-primary text-primary-foreground shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>Satélite HD</span>
            </button>
            <button
              type="button"
              onClick={() => setBase("dark")}
              className={`px-2 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition-colors cursor-pointer ${
                base === "dark" ? "bg-primary text-primary-foreground shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Oscuro</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setClusteringEnabled(!clusteringEnabled)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
              clusteringEnabled
                ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm"
                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Clústeres {clusteringEnabled ? "ON" : "OFF"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWaterResources(!showWaterResources)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
              showWaterResources
                ? "bg-sky-500/20 text-sky-400 border-sky-500/50 shadow-sm"
                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white"
            }`}
            title="Ríos, Riachuelos, Lagunas y Tanques de Cochabamba"
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Ríos/Tanques</span>
          </button>

          <button
            type="button"
            onClick={() => setShowVegetationZones(!showVegetationZones)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
              showVegetationZones
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm"
                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white"
            }`}
            title="Zonas de Vegetación e Inflamabilidad (Eucalipto, Ichu, Kewiña SERNAP)"
          >
            <Trees className="w-3.5 h-3.5" />
            <span>Vegetación</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSuggestedCisterns(!showSuggestedCisterns)}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
              showSuggestedCisterns
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-sm"
                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white"
            }`}
            title="Zonas de Recurrencia Crítica y Pre-Posicionamiento de Cisternas GAMC"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Cisternas</span>
          </button>
        </div>

        {/* Panorámicas Rápidas + Píldora de Viento */}
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={() => map.current?.flyTo([-16.5, -64.5], 6, { duration: 1 })}
            className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
            title="Vista Nacional de Bolivia"
          >
            <Flag className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Ver Bolivia</span>
          </button>

          <button
            type="button"
            onClick={() => map.current?.flyTo([-17.35, -65.85], 8, { duration: 0.9 })}
            className="px-2 py-1 text-[11px] font-bold rounded-lg border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 flex items-center gap-1 cursor-pointer"
            title="Vista Departamento de Cochabamba"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Depto. Cochabamba</span>
          </button>

          <button
            type="button"
            onClick={() => map.current?.flyTo([-17.3935, -66.157], 11, { duration: 0.8 })}
            className="px-2 py-1 text-[11px] font-bold rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1 cursor-pointer"
            title="Vista Parque Tunari y Valle Central"
          >
            <Mountain className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Valle Tunari</span>
          </button>

          {/* Píldora de Viento Integrada */}
          <div className="flex items-center gap-1.5 bg-sky-950/70 border border-sky-500/40 px-2.5 py-1 rounded-lg text-[11px] font-mono text-sky-300 shadow-sm">
            <div
              className="w-4 h-4 rounded-full bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-300 font-bold text-[10px] transition-transform"
              style={{ transform: `rotate(${(wind.deg + 180) % 360}deg)` }}
            >
              ↑
            </div>
            <span className="font-sans text-[10px] text-muted-foreground">VIENTO:</span>
            <span className="font-bold">{Math.round(wind.kmh)} km/h</span>
            <span className="text-[10px] text-amber-300 font-semibold">{wind.deg}° ➔ {(wind.deg + 180) % 360}°</span>
          </div>
        </div>
      </div>

      {/* LIENZO DEL MAPA LEAFLET */}
      <div className="relative flex-1 w-full min-h-[460px]">
        <div ref={el} className="h-full w-full min-h-[460px]" />

        {/* Capa acelerada por GPU WebGL / Shader Canvas */}
        <WebGLThermalLayer
          map={map.current}
          clusters={clusters}
          enabled={webglEnabled}
          heatmapEnabled={heatmapEnabled}
          windFlowEnabled={windFlowEnabled}
          wind={wind}
          center={center}
        />

        {/* DOCK TÁCTICO FLOTANTE DE ZOOM Y GPS (right-3 top-3) */}
        <div className="glass absolute right-3 top-3 z-[400] flex flex-col gap-1 rounded-xl p-1 shadow-2xl backdrop-blur-md border border-slate-700/60">
          <button
            type="button"
            onClick={() => map.current?.zoomIn(0.5)}
            className="h-8 w-8 rounded-lg bg-slate-900/90 text-primary hover:bg-primary hover:text-primary-foreground font-bold flex items-center justify-center transition-all shadow border border-primary/30 cursor-pointer"
            title="Acercar (Zoom +0.5)"
            aria-label="Acercar mapa"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => map.current?.zoomOut(0.5)}
            className="h-8 w-8 rounded-lg bg-slate-900/90 text-primary hover:bg-primary hover:text-primary-foreground font-bold flex items-center justify-center transition-all shadow border border-primary/30 cursor-pointer"
            title="Alejar (Zoom -0.5)"
            aria-label="Alejar mapa"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="h-px w-full bg-slate-700/60 my-0.5" />
          <button
            type="button"
            onClick={() => {
              if (selectedIncident) {
                map.current?.flyTo([selectedIncident.lat, selectedIncident.lng], 14, { duration: 0.8 });
              } else if (incidents.length > 0) {
                const topFire = [...incidents].sort((a, b) => (b.frp ?? 0) - (a.frp ?? 0))[0]!;
                onSelectRef.current?.(topFire.id);
                map.current?.flyTo([topFire.lat, topFire.lng], 14, { duration: 0.8 });
              }
            }}
            className="h-8 w-8 rounded-lg bg-slate-900/90 text-amber-400 hover:bg-amber-500 hover:text-slate-950 font-bold flex items-center justify-center transition-all shadow border border-amber-500/40 cursor-pointer"
            title="Centrar en Foco Activo Crítico"
            aria-label="Centrar foco activo"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleLocate}
            className={`h-8 w-8 rounded-lg font-bold flex items-center justify-center transition-all shadow border cursor-pointer ${
              locating
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-slate-900/90 text-slate-300 hover:bg-slate-800 border-slate-700"
            }`}
            title="Mi Ubicación GPS en Vivo"
            aria-label="Mi GPS"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        {/* Selector Táctico de Modo y Leyenda Preventiva (Fase 1) */}
        <PreventiveLegend
          mode={activeMode}
          onModeChange={handleModeChange}
          className="absolute left-3 bottom-3 z-[400]"
        />

        {/* INSPECTOR TÁCTICO FLOTANTE ANCLADO (REEMPLAZA VENTANAS PERDIDAS / POPUPS DESBORDADOS) */}
        {isInspectorVisible && selectedIncident && (
          <div
            role="dialog"
            aria-label="Inspector de Emergencia Táctica"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="glass absolute bottom-2 sm:bottom-12 right-1 sm:right-4 left-1 sm:left-auto z-[500] w-auto sm:w-[380px] max-h-[calc(100%-16px)] sm:max-h-[72vh] overflow-y-auto rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl border border-primary/50 text-foreground animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/50">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                      selectedIncident.status === "Controlado"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : (selectedIncident.frp ?? 0) < 8
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        : "bg-red-500/20 text-red-400 border border-red-500/40 ring-1 ring-red-500/30"
                    }`}
                  >
                    {selectedIncident.status === "Controlado" ? (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-400" /> Foco Controlado
                      </>
                    ) : (selectedIncident.frp ?? 0) < 8 ? (
                      <>
                        <Activity className="w-3 h-3 text-amber-400" /> Anomalía Inicial (&lt;300°C)
                      </>
                    ) : (
                      <>
                        <Flame className="w-3 h-3 text-red-400" /> Foco Activo Confirmado
                      </>
                    )}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {selectedIncident.source}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-foreground mt-1 truncate">
                  {selectedIncident.zone}
                </h4>
                <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-2">
                  <span>
                    {selectedIncident.lat.toFixed(5)}, {selectedIncident.lng.toFixed(5)}
                  </span>
                  <span>·</span>
                  <span>Conf: {selectedIncident.confidence ?? 95}%</span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (selectedIncident) setClosedId(selectedIncident.id);
                  else setClosedId("all");
                  onSelectRef.current?.("");
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (selectedIncident) setClosedId(selectedIncident.id);
                  else setClosedId("all");
                  onSelectRef.current?.("");
                }}
                className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold transition-colors shrink-0 cursor-pointer active:scale-90 shadow border border-slate-600/50"
                title="Cerrar inspector táctico"
                aria-label="Cerrar inspector táctico"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Telemetría Térmica e Hídrica */}
            <div className="grid grid-cols-3 gap-2 my-2.5 font-mono text-center">
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-1.5">
                <div className="text-[9px] text-muted-foreground uppercase">Potencia FRP</div>
                <div className="text-sm font-black text-amber-400">
                  {selectedIncident.frp ?? "N/D"} <span className="text-[10px] font-normal">MW</span>
                </div>
                <div className="text-[9px] text-amber-300/80">{classifyFrp(selectedIncident.frp).category}</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-1.5">
                <div className="text-[9px] text-muted-foreground uppercase">Temp. Brillo</div>
                <div className="text-sm font-black text-red-400">
                  ~{Math.round(300 + (selectedIncident.frp ?? 10) * 8.5)} <span className="text-[10px] font-normal">K</span>
                </div>
                <div className="text-[9px] text-red-300/80">Termosensor</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-1.5">
                <div className="text-[9px] text-muted-foreground uppercase">Agua Estimada</div>
                <div className="text-sm font-black text-sky-400">
                  ~{classifyFrp(selectedIncident.frp).recommendedWaterLiters.toLocaleString()} <span className="text-[10px] font-normal">L</span>
                </div>
                <div className="text-[9px] text-sky-300/80">Extinción</div>
              </div>
            </div>

            {/* Sección de Propagación a Sotavento */}
            {selectedForecast && (
              <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-2.5 my-2.5 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between font-bold text-amber-400 text-xs">
                  <span className="flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-amber-400" /> Vector de Propagación del Fuego
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    ROS: ~{selectedForecast.rateOfSpreadKmH} km/h
                  </span>
                </div>
                <div className="text-muted-foreground leading-snug">
                  Viento sopla a <b className="text-foreground">{Math.round(wind.kmh)} km/h</b> desde <b className="text-foreground">{wind.deg}°</b> hacia <b className="text-amber-300">{selectedForecast.windCardinalTo} ({Math.round(selectedForecast.bearingTo)}°)</b>.
                </div>
                {/* Horizontes */}
                <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] font-mono text-center">
                  <div className="bg-red-950/60 border border-red-500/50 rounded p-1">
                    <div className="text-red-400 font-bold">30 min</div>
                    <div className="text-foreground font-semibold">+{ (selectedForecast.rateOfSpreadKmH * 0.5).toFixed(1) } km</div>
                    <div className="text-[8px] text-red-300">Ataque Rápido</div>
                  </div>
                  <div className="bg-orange-950/60 border border-orange-500/50 rounded p-1">
                    <div className="text-orange-400 font-bold">1 hora</div>
                    <div className="text-foreground font-semibold">+{ (selectedForecast.rateOfSpreadKmH * 1.0).toFixed(1) } km</div>
                    <div className="text-[8px] text-orange-300">Línea Defensa</div>
                  </div>
                  <div className="bg-amber-950/60 border border-amber-500/50 rounded p-1">
                    <div className="text-amber-400 font-bold">2 horas</div>
                    <div className="text-foreground font-semibold">+{ (selectedForecast.rateOfSpreadKmH * 2.0).toFixed(1) } km</div>
                    <div className="text-[8px] text-amber-300">Evacuación</div>
                  </div>
                </div>

                {/* Comunidades en trayectoria */}
                {selectedForecast.threatenedCommunities.length > 0 ? (
                  <div className="mt-2 pt-1.5 border-t border-slate-700/60">
                    <div className="text-[10px] font-bold text-red-400 flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Comunidades en Trayectoria Directa:
                    </div>
                    <div className="space-y-1">
                      {selectedForecast.threatenedCommunities.slice(0, 3).map((comm, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-red-950/40 border border-red-800/40 rounded px-2 py-1 text-[10px]">
                          <span className="font-semibold text-foreground truncate">{comm.name}</span>
                          <span className="font-mono text-red-300 shrink-0 ml-1">
                            {comm.distKm} km · ETA: ~{comm.etaMin} min
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-emerald-400/90 flex items-center gap-1 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Sin asentamientos urbanos en el cono directo a 2 horas.
                  </div>
                )}
              </div>
            )}

            {/* Recurso Hídrico más cercano */}
            {nearestWaterSelected && (
              <div className="bg-slate-900/80 border border-sky-500/30 rounded-xl p-2.5 my-2.5 text-[11px] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-sky-400 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-400" /> Fuente Hídrica más Cercana:
                  </div>
                  <div className="font-semibold text-foreground text-xs truncate">
                    {nearestWaterSelected.resource.name} ({nearestWaterSelected.resource.categoryLabel})
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    A {nearestWaterSelected.distKm} km · {nearestWaterSelected.resource.flowStatus}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    map.current?.flyTo([nearestWaterSelected.resource.lat, nearestWaterSelected.resource.lng], 14, { duration: 0.8 });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-bold border border-sky-500/40 shrink-0 transition-colors cursor-pointer"
                  title="Ver fuente de agua en el mapa"
                >
                  Ver Fuente ➔
                </button>
              </div>
            )}

            {/* Botones de Acción Táctica Inmediata */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => planRoute("access", selectedIncident.lat, selectedIncident.lng)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" /> Ruta Bomberos
              </button>
              <button
                type="button"
                onClick={() => planRoute("escape", selectedIncident.lat, selectedIncident.lng)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Footprints className="w-3.5 h-3.5" /> Ruta Escape
              </button>
              <button
                type="button"
                onClick={() => {
                  map.current?.flyTo([selectedIncident.lat, selectedIncident.lng], 15, { duration: 0.8 });
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-foreground font-bold text-[11px] border border-slate-700 transition-all active:scale-95 cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" /> Centrar Foco
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-extrabold text-[11px] border border-emerald-500/50 transition-all active:scale-95 text-center cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp 119
              </a>
            </div>
          </div>
        )}

        {/* Modal / Toast de Ruta de Evacuación */}
        {routeInfo &&
          (() => {
            const [txt = "", link] = routeInfo.split("|");
            const [title, detail] = txt.includes(": ")
              ? [txt.slice(0, txt.indexOf(": ")), txt.slice(txt.indexOf(": ") + 2)]
              : ["Ruta", txt];
            return (
              <div
                role="status"
                aria-live="polite"
                className="glass absolute bottom-24 left-2 right-14 z-[401] max-h-[30%] overflow-y-auto rounded-md p-2 text-foreground sm:right-auto sm:max-w-sm"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-primary">{title}</div>
                    <div className="text-sm leading-snug">{detail}</div>
                  </div>
                  <TacButton
                    tone="ghost"
                    onClick={() => {
                      routeRequest.current++;
                      setRouteInfo("");
                      routeLayer.current?.clearLayers();
                    }}
                    className="h-9 w-9 shrink-0 p-0 text-lg flex items-center justify-center"
                    aria-label="Cerrar ruta"
                  >
                    <X className="w-4 h-4" />
                  </TacButton>
                </div>
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex min-h-11 items-center justify-center rounded bg-primary px-3 text-sm font-bold text-primary-foreground"
                  >
                    Navegar con GPS
                  </a>
                )}
              </div>
            );
          })()}

        {mapError && (
          <details className="glass absolute bottom-20 left-2 right-14 z-[400] max-h-24 overflow-y-auto rounded-md p-2 text-[10px]">
            <summary className="cursor-pointer text-warning">Estado del mapa</summary>
            <p role="status">{mapError}</p>
          </details>
        )}

        {/* Pie de Telemetría Táctica */}
        <div className="glass pointer-events-none absolute bottom-1.5 left-2 right-12 z-[400] rounded px-2 py-0.5 font-mono text-[9px] text-foreground flex items-center justify-between backdrop-blur-md">
          <span>Esri HD · Tunari SERNAP · 11 Cisternas GAMC / SEMAPA</span>
          <span className="text-primary font-bold">Zoom {Math.round(currentZoom * 10) / 10} · {currentZoom >= 12 ? "Modo Táctico 375m" : "Modo Clúster Macro"}</span>
        </div>
      </div>
    </div>
  );
}
