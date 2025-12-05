"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      {
        /* Explicit background colors needed: Tailwind v4's bg-card utility doesn't resolve
          the CSS variable properly in this fixed-position context. Using theme-matching
          colors: white for light mode, hsl(222.2 84% 4.9%) matches --card in dark mode */
      }
      <Card className="mx-auto max-w-4xl p-4 md:p-6 shadow-lg bg-white dark:bg-[hsl(222.2_84%_4.9%)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <h3 className="mb-2 text-lg font-semibold">Cookie Consent</h3>
            <p className="text-sm text-muted-foreground">
              We use cookies and analytics to improve your experience, measure site performance, and
              understand how you use our platform. By clicking &quot;Accept&quot;, you consent to
              our use of cookies and analytics tools.{" "}
              <a
                href="/privacy"
                className="underline hover:text-foreground"
              >
                Learn more
              </a>
            </p>
          </div>
          <div className="flex gap-2 md:flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleDecline}
              className="flex-1 md:flex-initial"
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 md:flex-initial"
            >
              Accept
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
