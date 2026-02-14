"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { reportErrorBoundary } from "@/lib/errors/console-capture.client";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

export default function OrbitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportErrorBoundary(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error.message || "An unexpected error occurred in Orbit"}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button onClick={() => window.location.href = "/orbit"} variant="outline">
            Back to Orbit
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
