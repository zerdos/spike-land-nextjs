"use client";

import { ORBIT_STORAGE_KEY } from "@/components/orbit/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export default function OrbitPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch workspaces first, then decide where to redirect
    fetch("/api/workspaces")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch workspaces");
        }
        return res.json();
      })
      .then((data) => {
        const workspaces = (data.workspaces ?? []) as Workspace[];

        if (workspaces.length === 0) {
          // No workspaces available, show landing
          setIsLoading(false);
          return;
        }

        // Check localStorage for last workspace
        const lastSlug = localStorage.getItem(ORBIT_STORAGE_KEY);

        // Verify the stored slug exists in user's workspaces
        const storedWorkspace = lastSlug
          ? workspaces.find((w) => w.slug === lastSlug)
          : null;

        if (storedWorkspace) {
          // Redirect to last used workspace
          router.replace(`/orbit/${storedWorkspace.slug}/dashboard`);
        } else {
          // Use first workspace and save it
          const firstWorkspace = workspaces[0]!;
          localStorage.setItem(ORBIT_STORAGE_KEY, firstWorkspace.slug);
          router.replace(`/orbit/${firstWorkspace.slug}/dashboard`);
        }
      })
      .catch((err) => {
        // Error fetching, show error state
        setError(err.message || "Failed to load workspaces");
        setIsLoading(false);
      });
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight">Orbit</h1>
          <p className="text-xl text-muted-foreground">
            Loading your workspace...
          </p>
          <div className="mt-4 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Orbit</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Orbit</h1>
        <p className="mb-8 text-xl text-muted-foreground">
          Your Social Command Center
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Welcome to Orbit</CardTitle>
            <CardDescription>
              Get started by creating your first workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Orbit helps you manage your social media presence with AI-powered tools for content
              creation, scheduling, and analytics.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild variant="outline">
                <Link href="/">Back to Home</Link>
              </Button>
              <Button disabled>
                Create Workspace (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
