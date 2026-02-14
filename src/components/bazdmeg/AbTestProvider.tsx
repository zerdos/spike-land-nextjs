"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface AbTestContextValue {
  variant: string | null;
  isLoading: boolean;
}

const AbTestContext = createContext<AbTestContextValue>({
  variant: null,
  isLoading: true,
});

export function useAbTest() {
  return useContext(AbTestContext);
}

interface AbTestProviderProps {
  testId: string;
  visitorId: string;
  children: ReactNode;
}

/**
 * React Context provider for A/B testing.
 * Reads/writes ab_variant cookie and calls the assign API.
 */
export function AbTestProvider({
  testId,
  visitorId,
  children,
}: AbTestProviderProps) {
  const [variant, setVariant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check cookie first
    const cookieMatch = document.cookie.match(/ab_variant=([^;]+)/);
    if (cookieMatch) {
      setVariant(cookieMatch[1]!);
      setIsLoading(false);
      return;
    }

    // Fetch assignment from API
    fetch(`/api/ab-test/assign?testId=${testId}&visitorId=${visitorId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: { variantName?: string }) => {
        const v = data.variantName || "control";
        setVariant(v);
        // Set cookie for 30 days
        document.cookie = `ab_variant=${v};path=/;max-age=${30 * 24 * 60 * 60};samesite=lax`;
      })
      .catch(() => {
        // Fallback to control if no test exists
        setVariant("control");
      })
      .finally(() => setIsLoading(false));
  }, [testId, visitorId]);

  return (
    <AbTestContext.Provider value={{ variant, isLoading }}>
      {children}
    </AbTestContext.Provider>
  );
}
