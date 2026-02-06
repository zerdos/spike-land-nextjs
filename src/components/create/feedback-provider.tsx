"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { FeedbackDialog } from "./feedback-dialog";

const DISMISS_KEY = "feedback-dismiss";

interface DismissState {
  count: number;
  until: number; // timestamp
}

interface AppContext {
  appSlug?: string;
  appTitle?: string;
  codespaceId?: string;
}

interface FeedbackContextValue {
  openDialog: (appContext?: AppContext) => void;
  shouldAutoShow: () => boolean;
  recordDismissal: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used within FeedbackProvider");
  return ctx;
}

function getDismissState(): DismissState {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return { count: 0, until: 0 };
    return JSON.parse(raw) as DismissState;
  } catch {
    return { count: 0, until: 0 };
  }
}

function saveDismissState(state: DismissState) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable
  }
}

export function FeedbackProvider({ children }: { children: React.ReactNode; }) {
  const [open, setOpen] = useState(false);
  const [appContext, setAppContext] = useState<AppContext>({});

  const openDialog = useCallback((ctx?: AppContext) => {
    setAppContext(ctx ?? {});
    setOpen(true);
  }, []);

  const shouldAutoShow = useCallback(() => {
    const state = getDismissState();
    // 3+ dismissals = never auto-show
    if (state.count >= 3) return false;
    // Check cooldown
    if (Date.now() < state.until) return false;
    return true;
  }, []);

  const recordDismissal = useCallback(() => {
    const state = getDismissState();
    const newCount = state.count + 1;
    const cooldownMs = newCount === 1
      ? 24 * 60 * 60 * 1000 // 24h
      : newCount === 2
      ? 7 * 24 * 60 * 60 * 1000 // 7 days
      : Infinity; // never
    saveDismissState({
      count: newCount,
      until: Date.now() + cooldownMs,
    });
  }, []);

  const value = useMemo(
    () => ({ openDialog, shouldAutoShow, recordDismissal }),
    [openDialog, shouldAutoShow, recordDismissal],
  );

  return (
    <FeedbackContext value={value}>
      {children}
      <FeedbackDialog
        open={open}
        onOpenChange={setOpen}
        appSlug={appContext.appSlug}
        appTitle={appContext.appTitle}
        codespaceId={appContext.codespaceId}
      />
    </FeedbackContext>
  );
}
