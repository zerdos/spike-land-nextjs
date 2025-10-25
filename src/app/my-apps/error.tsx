'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorLogger } from '@/lib/error-logger';

export default function MyAppsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to error reporting service
    errorLogger.logError(error, {
      route: '/my-apps',
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading My Apps</CardTitle>
          <CardDescription>
            We couldn't load your apps. This might be a temporary issue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>What happened?</AlertTitle>
            <AlertDescription>
              {error.message || 'Failed to load your apps'}
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
