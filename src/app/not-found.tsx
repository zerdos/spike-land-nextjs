"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect } from "react";

function report404(route: string): void {
  try {
    const payload = {
      errors: [
        {
          message: `404 Not Found: ${route}`,
          errorType: "NotFound",
          route,
          timestamp: new Date().toISOString(),
          environment: "FRONTEND" as const,
          metadata: { source: "not-found-page" },
        },
      ],
    };
    navigator.sendBeacon(
      "/api/errors/report",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
    );
  } catch {
    // Silently fail
  }
}

export default function NotFound() {
  useEffect(() => {
    report404(window.location.pathname);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">Page not found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact support.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            onClick={() => window.location.href = "/"}
            variant="default"
          >
            Go home
          </Button>
          <Button
            onClick={() => window.location.href = "/my-apps"}
            variant="outline"
          >
            Back to My Apps
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
