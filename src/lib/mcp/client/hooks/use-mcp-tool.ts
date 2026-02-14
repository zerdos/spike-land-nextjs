"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { callTool } from "../mcp-client";

export interface UseMcpToolOptions<T, R> {
  enabled?: boolean;
  refetchInterval?: number;
  transform?: (data: T) => R;
  onSuccess?: (data: R) => void;
  onError?: (error: Error) => void;
}

export function useMcpTool<T = unknown, R = T>(
  name: string,
  args: unknown = {},
  options: UseMcpToolOptions<T, R> = {},
) {
  const {
    enabled = true,
    refetchInterval,
    transform,
  } = options;

  const [data, setData] = useState<R | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefetching, setIsRefetching] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const fetch = useCallback(async (isManual = false) => {
    if (!isManual) {
      if (!isRefetching) setIsLoading(true);
    } else {
      setIsRefetching(true);
    }

    try {
      const rawData = await callTool<T>(name, args);
      const processedData = transform ? transform(rawData) : (rawData as unknown as R);
      
      setData(processedData);
      setError(undefined);
      optionsRef.current.onSuccess?.(processedData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      optionsRef.current.onError?.(error);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [name, args, transform, isRefetching]);

  useEffect(() => {
    if (enabled) {
      fetch();
    }
  }, [enabled, fetch]);

  useEffect(() => {
    if (enabled && refetchInterval) {
      const interval = setInterval(() => fetch(true), refetchInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [enabled, refetchInterval, fetch]);

  return {
    data,
    error,
    isLoading,
    isRefetching,
    refetch: () => fetch(true),
  };
}
