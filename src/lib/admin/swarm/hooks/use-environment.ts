"use client";

import { useCallback, useEffect, useState } from "react";
import type { EnvironmentInfo } from "../types";

export function useEnvironments() {
  const [data, setData] = useState<EnvironmentInfo[] | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const fetchEnvironments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/environments");
      if (!res.ok) throw new Error("Failed to fetch environments");
      const envs: EnvironmentInfo[] = await res.json();
      setData(envs);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnvironments();
    const interval = setInterval(fetchEnvironments, 60_000);
    return () => clearInterval(interval);
  }, [fetchEnvironments]);

  return { data, error, isLoading, mutate: fetchEnvironments };
}
