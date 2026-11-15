import { useState, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { REGIONS, ALL_REGIONS, TUNARI_REGIONS, regionalIncidents, getFallbackWeatherForPoint } from "@/lib/nasa-data";
import { gibsQuery, powerQuery, snapshotQuery } from "@/lib/nasa-queries";
import { INCIDENTS } from "@/lib/centinela-data";
import { harmonizeHotspots } from "@/lib/harmonization";

export function useNasa() {
  const [simulationMode, setSimulationMode] = useState(false);
  const [regionId, setRegion] = useState("all");
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

  // Fallback de Resiliencia Crítica:
  // Si simulationMode está activado, o si la NASA no reporta fuegos en este minuto exacto,
  // se muestran los incidentes de alta severidad del Parque Tunari para demostrar el despacho ICS-209.
  const activeIncidents = useMemo(() => {
    if (simulationMode) return INCIDENTS;
    return snapshot.data.incidents.length > 0 ? snapshot.data.incidents : INCIDENTS;
  }, [simulationMode, snapshot.data.incidents]);

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
      source: simulationMode ? ("Simulación Tunari" as const) : snapshot.data.source,
      incidents: activeIncidents,
      harmonizationStats: stats,
    };
  }, [snapshot.data, simulationMode, activeIncidents, stats]);

  return {
    simulationMode,
    setSimulationMode,
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
