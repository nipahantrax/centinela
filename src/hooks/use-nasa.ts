import { useState, useMemo, useEffect } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { REGIONS, ALL_REGIONS, TUNARI_REGIONS, regionalIncidents, getFallbackWeatherForPoint } from "@/lib/nasa-data";
import { gibsQuery, powerQuery, snapshotQuery } from "@/lib/nasa-queries";
import { INCIDENTS, type Incident } from "@/lib/centinela-data";
import { harmonizeHotspots } from "@/lib/harmonization";
import { fetchFocosSatelitales, subscribeFocosLive } from "@/lib/supabase";

export function useNasa() {
  const [simulationMode, setSimulationMode] = useState(false);
  const [regionId, setRegion] = useState("all");
  const [liveFocos, setLiveFocos] = useState<Incident[] | null>(null);

  // Conexión en tiempo real con Supabase + PostGIS (tabla focos_satelitales)
  useEffect(() => {
    let mounted = true;
    fetchFocosSatelitales()
      .then((focos) => {
        if (mounted && focos && focos.length > 0) {
          setLiveFocos(focos);
        }
      })
      .catch((e) => console.warn("Supabase focos initial fetch:", e));

    const unsubscribe = subscribeFocosLive((updatedFocos) => {
      if (mounted && updatedFocos && updatedFocos.length > 0) {
        setLiveFocos(updatedFocos);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const effectiveRegionId = simulationMode ? "cercado" : regionId;
  const region = useMemo(() => {
    return TUNARI_REGIONS.find((r) => r.id === effectiveRegionId) ?? ALL_REGIONS.find((r) => r.id === effectiveRegionId) ?? TUNARI_REGIONS[0]!;
  }, [effectiveRegionId]);
  const [point, setPoint] = useState<[number, number] | null>(null);
  const center: [number, number] = useMemo(() => {
    return point ?? region.center;
  }, [point, region]);
  const zoom: number = region.zoom ?? 11;
  const snapshot = useSuspenseQuery(snapshotQuery);
  const gibs = useQuery(gibsQuery);
  const power = useQuery(powerQuery(center[0], center[1]));
  
  // Clima determinístico calibrado de contingencia sincronizado con el motor preventivo si la API está cargando
  const fallbackWeather = useMemo(() => getFallbackWeatherForPoint(center[0], center[1]), [center[0], center[1]]);
  const weather = power.data?.weather ?? fallbackWeather;
  const predictive = power.data?.predictive ?? null;

  // Fallback de Resiliencia Crítica con priorización en tiempo real:
  // 1. simulationMode -> INCIDENTS
  // 2. liveFocos de Supabase + PostGIS
  // 3. snapshot NASA FIRMS
  // 4. INCIDENTS locales de contingencia
  const activeIncidents = useMemo(() => {
    if (simulationMode) return INCIDENTS;
    if (liveFocos && liveFocos.length > 0) return liveFocos;
    return snapshot.data.incidents.length > 0 ? snapshot.data.incidents : INCIDENTS;
  }, [simulationMode, liveFocos, snapshot.data.incidents]);

  const fallbackHarmonization = useMemo(() => {
    return harmonizeHotspots(INCIDENTS).stats;
  }, []);

  const stats = simulationMode
    ? fallbackHarmonization
    : snapshot.data.harmonizationStats?.dualConfirmedClusters
    ? snapshot.data.harmonizationStats
    : fallbackHarmonization;

  const enrichedSnapshot = useMemo(() => {
    return {
      ...snapshot.data,
      source: simulationMode
        ? ("Simulación Tunari" as const)
        : liveFocos && liveFocos.length > 0
        ? ("Supabase PostGIS Live" as const)
        : snapshot.data.source,
      incidents: activeIncidents,
      harmonizationStats: stats,
    };
  }, [snapshot.data, simulationMode, liveFocos, activeIncidents, stats]);

  return {
    simulationMode,
    setSimulationMode,
    isLiveSupabase: Boolean(liveFocos && liveFocos.length > 0),
    regionId: effectiveRegionId,
    setRegion: (id: string) => {
      setRegion(id);
      const reg = TUNARI_REGIONS.find((r) => r.id === id) ?? ALL_REGIONS.find((r) => r.id === id);
      if (reg) {
        setPoint(reg.center);
      } else {
        setPoint(null);
      }
    },
    region,
    center,
    zoom,
    setPoint,
    weather,
    predictive,
    weatherReal: Boolean(power.data?.weather),
    weatherDate: power.data?.date,
    powerError: power.data?.error,
    incidents: regionalIncidents(activeIncidents, effectiveRegionId),
    snapshot: enrichedSnapshot,
    gibs: gibs.data,
    syncing: snapshot.isFetching || power.isFetching,
    refresh: () => Promise.all([snapshot.refetch(), power.refetch()]),
  };
}
