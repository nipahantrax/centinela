import { queryOptions } from "@tanstack/react-query";
import { getGibsDates, getNasaSnapshot, getPower } from "./nasa.functions";
export const snapshotQuery = queryOptions({ queryKey: ["nasa", "snapshot"], queryFn: () => getNasaSnapshot(), staleTime: 300000, refetchInterval: 300000 });
export const gibsQuery = queryOptions({ queryKey: ["nasa", "gibs"], queryFn: () => getGibsDates(), staleTime: 3600000 });
export const powerQuery = (lat: number, lng: number) => queryOptions({ queryKey: ["nasa", "power", lat, lng], queryFn: () => getPower({ data: { lat, lng } }), staleTime: 3600000 });