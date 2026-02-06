"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useFeedback } from "./feedback-provider";

const TIMER_DELAY_MS = 10_000;

interface FeedbackTimerProps {
  appSlug?: string;
  appTitle?: string;
  codespaceId?: string;
}

export function FeedbackTimer({ appSlug, appTitle, codespaceId }: FeedbackTimerProps) {
  const { openDialog, shouldAutoShow, recordDismissal } = useFeedback();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!shouldAutoShow()) return;

    const timeoutId = setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;

      toast("How's this app working?", {
        description: "Found a bug or have feedback? Let us know!",
        action: {
          label: "Report Issue",
          onClick: () => openDialog({ appSlug, appTitle, codespaceId }),
        },
        cancel: {
          label: "Dismiss",
          onClick: () => recordDismissal(),
        },
        duration: 15_000,
      });
    }, TIMER_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [openDialog, shouldAutoShow, recordDismissal, appSlug, appTitle, codespaceId]);

  return null;
}
