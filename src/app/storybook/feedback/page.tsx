"use client";

import { Section } from "@/components/storybook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      </Section>
    </div>
  );
}
