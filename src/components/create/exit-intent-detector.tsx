"use client";

import { useEffect, useRef } from "react";
import { useFeedback } from "./feedback-provider";

interface ExitIntentDetectorProps {
  appSlug?: string;
  appTitle?: string;
  codespaceId?: string;
}

export function ExitIntentDetector({ appSlug, appTitle, codespaceId }: ExitIntentDetectorProps) {
  const { openDialog, shouldAutoShow, recordDismissal } = useFeedback();
  const firedRef = useRef(false);

  useEffect(() => {
    // Only on desktop (fine pointer)
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (!shouldAutoShow()) return;

    const handler = (e: MouseEvent) => {
      if (firedRef.current) return;
      if (e.clientY <= 0) {
        firedRef.current = true;
        openDialog({ appSlug, appTitle, codespaceId });
      }
    };

    document.documentElement.addEventListener("mouseleave", handler);
    return () => document.documentElement.removeEventListener("mouseleave", handler);
  }, [openDialog, shouldAutoShow, recordDismissal, appSlug, appTitle, codespaceId]);

  return null;
}
