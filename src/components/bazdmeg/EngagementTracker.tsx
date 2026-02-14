"use client";

import { useCallback, useEffect, useRef } from "react";

interface EngagementData {
  visitorId: string;
  page: string;
  abVariant?: string;
  scrollDepthMax: number;
  timeOnPageMs: number;
  sectionsViewed: string[];
  chatOpened: boolean;
  ctaClicked?: string;
  faqExpanded: number;
}

interface EngagementTrackerProps {
  visitorId: string;
  page: string;
  abVariant?: string;
  sectionIds: string[];
}

/**
 * Invisible component that tracks page engagement via
 * IntersectionObserver for scroll/sections and setInterval for time.
 * Debounced POST every 5 seconds.
 */
export function EngagementTracker({
  visitorId,
  page,
  abVariant,
  sectionIds,
}: EngagementTrackerProps) {
  const dataRef = useRef<EngagementData>({
    visitorId,
    page,
    abVariant,
    scrollDepthMax: 0,
    timeOnPageMs: 0,
    sectionsViewed: [],
    chatOpened: false,
    faqExpanded: 0,
  });

  const dirtyRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  const flush = useCallback(() => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;

    const payload = { ...dataRef.current };
    navigator.sendBeacon(
      "/api/bazdmeg/engagement",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );
  }, []);

  // Track time on page
  useEffect(() => {
    const interval = setInterval(() => {
      dataRef.current.timeOnPageMs = Date.now() - startTimeRef.current;
      dirtyRef.current = true;
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const depth = Math.round((window.scrollY / scrollHeight) * 100);
      if (depth > dataRef.current.scrollDepthMax) {
        dataRef.current.scrollDepthMax = depth;
        dirtyRef.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track section visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id;
            if (!dataRef.current.sectionsViewed.includes(sectionId)) {
              dataRef.current.sectionsViewed.push(sectionId);
              dirtyRef.current = true;
            }
          }
        }
      },
      { threshold: 0.3 },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sectionIds]);

  // Flush every 5 seconds and on unload
  useEffect(() => {
    const interval = setInterval(flush, 5000);

    const handleUnload = () => {
      dataRef.current.timeOnPageMs = Date.now() - startTimeRef.current;
      dirtyRef.current = true;
      flush();
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload(); // Final flush on unmount
    };
  }, [flush]);

  // Expose methods for other components to call
  useEffect(() => {
    const handler = (e: CustomEvent<{ type: string; value?: string }>) => {
      if (e.detail.type === "chatOpened") {
        dataRef.current.chatOpened = true;
        dirtyRef.current = true;
      } else if (e.detail.type === "ctaClicked") {
        dataRef.current.ctaClicked = e.detail.value;
        dirtyRef.current = true;
      } else if (e.detail.type === "faqExpanded") {
        dataRef.current.faqExpanded++;
        dirtyRef.current = true;
      }
    };

    window.addEventListener(
      "bazdmeg:engagement" as string,
      handler as EventListener,
    );
    return () =>
      window.removeEventListener(
        "bazdmeg:engagement" as string,
        handler as EventListener,
      );
  }, []);

  return null; // Invisible component
}

/** Helper to fire engagement events from other components */
export function trackEngagement(type: string, value?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("bazdmeg:engagement", {
      detail: { type, value },
    }),
  );
}
