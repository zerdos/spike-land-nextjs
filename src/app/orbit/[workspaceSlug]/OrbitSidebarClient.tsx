"use client";

import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const OrbitSidebar = dynamic(
  () => import("./OrbitSidebar").then((mod) => mod.OrbitSidebar),
  {
    ssr: false,
    loading: () => <OrbitSidebarSkeleton />,
  },
);

function OrbitSidebarSkeleton() {
  return (
    <>
      {/* Mobile trigger skeleton */}
      <div className="fixed left-4 top-4 z-40 lg:hidden">
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>

      {/* Desktop sidebar skeleton */}
      <div className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-background lg:flex">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>

          {/* Nav items */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="mt-4 h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
    </>
  );
}

interface OrbitSidebarClientProps {
  userEmail?: string | null;
  userName?: string | null;
  workspaceSlug: string;
}

export function OrbitSidebarClient({
  userEmail,
  userName,
  workspaceSlug,
}: OrbitSidebarClientProps) {
  return (
    <OrbitSidebar
      userEmail={userEmail}
      userName={userName}
      workspaceSlug={workspaceSlug}
    />
  );
}
