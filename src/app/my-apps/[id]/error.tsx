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
import { Link } from "@/components/ui/link";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string; };
  reset: () => void;
}

export default function AppWorkspaceError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("App workspace error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex items-center justify-center px-4 py-24">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              We encountered an error while loading this app workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error.message || "An unexpected error occurred"}
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-muted-foreground">
                Error ID: {error.digest}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button onClick={reset} variant="outline">
              Try Again
            </Button>
            <Link href="/my-apps">
              <Button>Back to My Apps</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
