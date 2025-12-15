"use client";

import { Section } from "@/components/storybook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function LoadingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-12">
      <Section title="Loading States" description="Skeleton loaders, progress bars, and spinners">
        {/* Skeleton Loaders */}
        <Card>
          <CardHeader>
            <CardTitle>Skeleton Loaders</CardTitle>
            <CardDescription>Placeholder components for loading states</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Default Skeleton</Label>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Shimmer Variant</Label>
              <div className="flex items-center space-x-4">
                <Skeleton variant="shimmer" className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton variant="shimmer" className="h-4 w-[250px]" />
                  <Skeleton variant="shimmer" className="h-4 w-[200px]" />
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Card Skeleton</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="pt-6 space-y-3">
                      <Skeleton variant="shimmer" className="h-32 w-full rounded-lg" />
                      <Skeleton variant="shimmer" className="h-4 w-3/4" />
                      <Skeleton variant="shimmer" className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Bars */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Bars</CardTitle>
            <CardDescription>Progress indicators with optional glow effect</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Default Progress (33%)</Label>
                <span className="text-muted-foreground">33%</span>
              </div>
              <Progress value={33} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Progress with Glow (66%)</Label>
                <span className="text-muted-foreground">66%</span>
              </div>
              <Progress value={66} glow />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Complete (100%)</Label>
                <span className="text-muted-foreground">100%</span>
              </div>
              <Progress value={100} glow />
            </div>
          </CardContent>
        </Card>

        {/* Spinners */}
        <Card>
          <CardHeader>
            <CardTitle>Spinners & Animations</CardTitle>
            <CardDescription>Loading indicators and pulse animations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-8 items-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Spinner</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary animate-pulse-cyan" />
                <span className="text-xs text-muted-foreground">Pulse Cyan</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-muted-foreground">Pulse</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
