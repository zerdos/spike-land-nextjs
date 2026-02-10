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

function reportNotFound(): void {
  const error = {
    message: `404 Not Found: ${typeof window !== "undefined" ? window.location.pathname : "unknown"}`,
    stack: undefined,
    errorType: "NotFound",
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    metadata: { source: "not-found-page" },
    timestamp: new Date().toISOString(),
    environment: "FRONTEND" as const,
  };

  try {
    fetch("/api/errors/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errors: [error] }),
    }).catch(() => {
      // Silently fail - don't cause more errors
    });
  } catch {
    // Silently fail
  }
}

export default function NotFound() {
  useEffect(() => {
    reportNotFound();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If you think this is a mistake, please let us know.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={() => window.location.href = "/"} variant="default">
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
