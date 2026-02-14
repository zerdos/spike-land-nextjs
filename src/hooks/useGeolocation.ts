"use client";

import { useQuery } from "@tanstack/react-query";
import { useCareerStore } from "@/lib/store/career";
import type { GeoLocation } from "@/lib/career/types";

async function fetchGeolocation(): Promise<GeoLocation> {
  const response = await fetch("/api/career/geolocation");
  if (!response.ok) throw new Error("Failed to detect location");
  const data = (await response.json()) as { location: GeoLocation };
  return data.location;
}

export function useGeolocation() {
  const { location, setLocation } = useCareerStore();

  const query = useQuery({
    queryKey: ["geolocation"],
    queryFn: fetchGeolocation,
    enabled: !location,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });

  // Sync to Zustand store when data arrives
  if (query.data && !location) {
    setLocation(query.data);
  }

  return {
    location: location ?? query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
