'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorLogger } from '@/lib/error-logger';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to error reporting service
    errorLogger.logError(error, {
      route: '/settings',
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Settings</CardTitle>
          <CardDescription>
            We couldn&apos;t load your settings. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>What happened?</AlertTitle>
            <AlertDescription>
              {error.message || 'Failed to load settings'}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            Go home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
