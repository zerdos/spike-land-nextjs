"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { CONSENT_KEY, notifyConsentChanged } from "@/lib/tracking/consent";
import { cn } from "@/lib/utils";

type ConsentValue = "accepted" | "declined" | null;

function getStoredConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "accepted" || value === "declined") return value;
  return null;
}

function setStoredConsent(value: "accepted" | "declined"): void {
  localStorage.setItem(CONSENT_KEY, value);
}

export function CookieConsent() {
  const [consent, setConsent] = useState<ConsentValue>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Auto-accept in development mode - no banner needed
    if (process.env.NODE_ENV === "development") {
      const stored = getStoredConsent();
      if (!stored) {
        setStoredConsent("accepted");
        notifyConsentChanged();
      }
      setConsent("accepted");
      return;
    }

    // In production, check stored preference
    const stored = getStoredConsent();
    if (stored) {
      setConsent(stored);
    } else {
      // No stored preference - show banner
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    setStoredConsent("accepted");
    notifyConsentChanged();
    setConsent("accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    setStoredConsent("declined");
    notifyConsentChanged();
    setConsent("declined");
    setIsVisible(false);
  };

  // Don't render anything if we have consent or banner shouldn't be visible
  if (consent || !isVisible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-background/60 backdrop-blur-md border-t border-white/5",
        "p-3 md:p-4",
        "animate-in slide-in-from-bottom-2 duration-300",
      )}
    >
      <div className="container mx-auto max-w-5xl px-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h2
              id="cookie-consent-title"
              className="text-sm font-bold font-heading text-foreground mb-0.5"
            >
              Cookie Preferences
            </h2>
            <p
              id="cookie-consent-description"
              className="text-xs text-muted-foreground leading-relaxed max-w-2xl"
            >
              We use cookies to enhance your experience and analyze traffic.{" "}
              <a
                href="/cookies"
                className="text-primary hover:underline"
              >
                Learn more
              </a>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-8"
              onClick={handleDecline}
            >
              Decline
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="text-[10px] h-8 px-4"
              onClick={handleAccept}
            >
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
