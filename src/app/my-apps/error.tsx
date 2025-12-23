"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { reportErrorBoundary } from "@/lib/errors/console-capture.client";
import { useEffect } from "react";

export default function MyAppsError({
  error,
  reset,
}: {
  error: Error & { digest?: string; };
  reset: () => void;
}) {
  useEffect(() => {
    reportErrorBoundary(error);
  }, [error]);

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive">
            Error Loading My Apps
          </CardTitle>
          <CardDescription>
            We couldn&apos;t load your apps. This might be a temporary issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>What happened?</AlertTitle>
            <AlertDescription>
              {process.env.NODE_ENV === "development" && error.message
                ? error.message
                : "An error occurred while loading your apps. This might be due to a temporary database connection issue."}
            </AlertDescription>
          </Alert>

          {process.env.NODE_ENV === "development" && (
            <Alert>
              <AlertTitle>Development Mode - Troubleshooting</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="font-semibold">Common causes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Database is not running</li>
                  <li>
                    DATABASE_URL environment variable is not set or incorrect
                  </li>
                  <li>
                    Prisma client needs to be generated (run: npm run db:generate)
                  </li>
                  <li>
                    Database migrations haven&apos;t been applied (run: npm run db:migrate)
                  </li>
                </ul>
                {error.digest && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Error digest: {error.digest}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button onClick={() => window.location.href = "/"} variant="outline">
            Go home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
