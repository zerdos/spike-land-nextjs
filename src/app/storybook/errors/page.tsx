"use client";

import { Section } from "@/components/storybook";
import { ErrorBoundary } from "@/components/errors/error-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

const BuggyComponent = () => {
  throw new Error("This is a simulated error!");
};

const ErrorTrigger = () => {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    return <BuggyComponent />;
  }

  return (
    <Button variant="destructive" onClick={() => setShouldError(true)}>
      Trigger Error
    </Button>
  );
};

export default function ErrorsPage() {
  return (
    <div className="space-y-12">
      <Section
        title="Error Handling"
        description="Components for handling and displaying errors"
      >
        {/* Error Boundary */}
        <Card>
          <CardHeader>
            <CardTitle>Error Boundary</CardTitle>
            <CardDescription>
              Catches JavaScript errors anywhere in their child component tree
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-md">
              <ErrorBoundary>
                <div className="flex flex-col gap-4 items-start">
                  <p className="text-sm text-muted-foreground">
                    Click the button below to crash this part of the UI and see the Error Boundary in action.
                  </p>
                  <ErrorTrigger />
                </div>
              </ErrorBoundary>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
