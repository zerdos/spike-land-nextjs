"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pixel-thumbnail-view-preference";

/**
 * Return type for the useThumbnailPreference hook
 */
interface UseThumbnailPreferenceReturn {
  /** Whether to show enhanced version of thumbnails (default: false - show original) */
  showEnhanced: boolean;
  /** Set the thumbnail preference explicitly to true (enhanced) or false (original) */
  setShowEnhanced: (value: boolean) => void;
  /** Toggle between showing original and enhanced thumbnails */
  toggleView: () => void;
}

/**
 * Hook for persisting thumbnail view preference in localStorage.
 * Defaults to showing original images (showEnhanced: false).
 * Handles SSR gracefully and syncs across tabs.
 *
 * @example
 * ```tsx
 * function ThumbnailGallery() {
 *   const { showEnhanced, setShowEnhanced, toggleView } = useThumbnailPreference();
 *
 *   return (
 *     <div>
 *       <button onClick={toggleView}>
 *         Show {showEnhanced ? "Original" : "Enhanced"}
 *       </button>
 *       <img src={showEnhanced ? enhancedUrl : originalUrl} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns {UseThumbnailPreferenceReturn} Hook state and actions
 * @property {boolean} showEnhanced - Whether to show enhanced version (default: false)
 * @property {Function} setShowEnhanced - Set preference explicitly
 * @property {Function} toggleView - Toggle between original/enhanced
 */
export function useThumbnailPreference(): UseThumbnailPreferenceReturn {
  const [showEnhanced, setShowEnhancedState] = useState<boolean>(false);

  // Read from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setShowEnhancedState(stored === "true");
    }
  }, []);

  // Sync across tabs using storage event
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue !== null) {
        setShowEnhancedState(event.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const setShowEnhanced = useCallback((value: boolean) => {
    setShowEnhancedState(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(value));
    }
  }, []);

  const toggleView = useCallback(() => {
    setShowEnhancedState((prev) => {
      const newValue = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, String(newValue));
      }
      return newValue;
    });
  }, []);

  return {
    showEnhanced,
    setShowEnhanced,
    toggleView,
  };
}
