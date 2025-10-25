'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorLogger } from '@/lib/error-logger';

export default function NewAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to error reporting service
    errorLogger.logError(error, {
      route: '/my-apps/new',
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive">Error Creating App</CardTitle>
          <CardDescription>
            We encountered an issue while creating your app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>What went wrong?</AlertTitle>
            <AlertDescription>
              {error.message || 'Failed to create app'}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button onClick={() => window.location.href = '/my-apps'} variant="outline">
            Back to My Apps
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
