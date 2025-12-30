import { useEffect, useRef } from "react";

/**
 * Custom hook for setting up an interval that can differ
 * based on state, and can be paused.
 *
 * @param callback - Function to call on interval
 * @param delay - Delay in ms, or null to pause
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
    return undefined;
  }, [delay]);
}
