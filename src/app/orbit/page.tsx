"use client";

import { ORBIT_STORAGE_KEY } from "@/components/orbit/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrbitPage() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    // Check localStorage for last workspace
    const lastSlug = localStorage.getItem(ORBIT_STORAGE_KEY);
    if (lastSlug) {
      router.replace(`/orbit/${lastSlug}/dashboard`);
      return;
    }

    // Fetch workspaces and redirect to first one
    fetch("/api/workspaces")
      .then((res) => res.json())
      .then((data) => {
        if (data.workspaces?.length > 0) {
          const firstWorkspace = data.workspaces[0];
          localStorage.setItem(ORBIT_STORAGE_KEY, firstWorkspace.slug);
          router.replace(`/orbit/${firstWorkspace.slug}/dashboard`);
        } else {
          // No workspaces available, show landing
          setIsRedirecting(false);
        }
      })
      .catch(() => {
        // Error fetching, show landing
        setIsRedirecting(false);
      });
  }, [router]);

  if (isRedirecting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight">Orbit</h1>
          <p className="text-xl text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Orbit</h1>
        <p className="mb-8 text-xl text-muted-foreground">
          Your Social Command Center
        </p>
        <p className="mb-4 text-muted-foreground">
          No workspaces found. Create your first workspace to get started.
        </p>
        <Button asChild size="lg" disabled>
          <Link href="#">Create Workspace (Coming Soon)</Link>
        </Button>
      </div>
    </div>
  );
}
