"use client";

import { Section } from "@/components/storybook";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Info, Terminal, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

export default function FeedbackPage() {
  return (
    <div className="space-y-12">
      <Section
        title="Feedback Components"
        description="Toast notifications and alert components for user feedback"
      >
        {/* Toast Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Toast Notifications</CardTitle>
            <CardDescription>Click the buttons to see different toast variants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                onClick={() => toast.success("Enhancement completed successfully!")}
              >
                Success Toast
              </Button>
              <Button variant="outline" onClick={() => toast.error("Failed to process image")}>
                Error Toast
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info("Processing started in background")}
              >
                Info Toast
              </Button>
              <Button variant="outline" onClick={() => toast.warning("Low token balance")}>
                Warning Toast
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast("Default toast", {
                    description: "This is a default toast with description",
                  })}
              >
                Default Toast
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Semantic Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Semantic State Colors</CardTitle>
            <CardDescription>
              Color utilities for success, warning, and error states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-success border border-success">
                <p className="text-success font-medium">Success State</p>
                <p className="text-sm text-muted-foreground">bg-success, border-success</p>
              </div>
              <div className="p-4 rounded-lg bg-warning border border-warning">
                <p className="text-warning font-medium">Warning State</p>
                <p className="text-sm text-muted-foreground">bg-warning, border-warning</p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive">
                <p className="text-destructive font-medium">Error State</p>
                <p className="text-sm text-muted-foreground">bg-destructive/10</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Component */}
        <Card>
          <CardHeader>
            <CardTitle>Alert</CardTitle>
            <CardDescription>
              Alert messages for important notifications and system feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Default Alert</AlertTitle>
              <AlertDescription>
                This is a default alert for general information and updates.
              </AlertDescription>
            </Alert>

            <Alert className="border-primary/50 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>
                Your enhancement is being processed. This may take a few moments.
              </AlertDescription>
            </Alert>

            <Alert className="border-green-500/50 bg-green-500/5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Your image has been enhanced successfully! View it in your gallery.
              </AlertDescription>
            </Alert>

            <Alert className="border-yellow-500/50 bg-yellow-500/5">
              <TriangleAlert className="h-4 w-4 text-yellow-500" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Your token balance is running low. Consider purchasing more tokens.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to process image. Please try again or contact support.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
