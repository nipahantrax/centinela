import { useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { REGIONS, regionalIncidents } from "@/lib/nasa-data";
import { gibsQuery, powerQuery, snapshotQuery } from "@/lib/nasa-queries";
export function useNasa() {
  const [regionId, setRegion] = useState("all");
  const region = REGIONS.find(r => r.id === regionId) ?? REGIONS[0];
  const [point, setPoint] = useState<[number, number] | null>(null);
  const center: [number, number] = point ?? region?.center ?? [-17.31, -66.2];
  const snapshot = useSuspenseQuery(snapshotQuery);
  const gibs = useQuery(gibsQuery);
  const power = useQuery(powerQuery(center[0], center[1]));
  const weather = power.data?.weather ?? null;
  return { regionId, setRegion: (id: string) => { setRegion(id); setPoint(null); }, region, center, setPoint, weather,
    weatherReal: Boolean(power.data?.weather), weatherDate: power.data?.date, powerError: power.data?.error,
    incidents: regionalIncidents(snapshot.data.incidents, regionId), snapshot: snapshot.data, gibs: gibs.data,
    syncing: snapshot.isFetching || power.isFetching,
    refresh: () => Promise.all([snapshot.refetch(), power.refetch()]),
  };
}