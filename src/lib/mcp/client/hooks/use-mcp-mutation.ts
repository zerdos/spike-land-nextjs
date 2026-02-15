"use client";

import { useCallback, useState, useRef } from "react";
import { callTool } from "../mcp-client";

export interface UseMcpMutationOptions<R> {
  onSuccess?: (data: R) => void;
  onError?: (error: Error) => void;
}

export function useMcpMutation<T = unknown, R = T>(
  name: string,
  options: UseMcpMutationOptions<R> = {},
) {
  const [data, setData] = useState<R | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mutate = useCallback(async (args: unknown = {}) => {
    setIsLoading(true);
    try {
      const rawData = await callTool<T>(name, args);
      setData(rawData as unknown as R);
      setError(undefined);
      optionsRef.current.onSuccess?.(rawData as unknown as R);
      return rawData as unknown as R;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      optionsRef.current.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [name]);

  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
    setIsLoading(false);
  }, []);

  return {
    mutate,
    data,
    error,
    isLoading,
    reset,
  };
}
