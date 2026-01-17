"use client";

import { BinAppCard } from "@/components/my-apps/BinAppCard";
import type { AppBuildStatus } from "@prisma/client";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface BinAppData {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  status: AppBuildStatus;
  codespaceId: string | null;
  codespaceUrl: string | null;
  deletedAt: string;
  daysRemaining: number;
  _count: {
    messages: number;
    images: number;
  };
}

interface BinPageClientProps {
  apps: BinAppData[];
}

export function BinPageClient({ apps: initialApps }: BinPageClientProps) {
  const router = useRouter();
  const [apps, setApps] = useState(initialApps);

  const handleRestore = async (id: string) => {
    const app = apps.find((a) => a.id === id);
    const appIdentifier = app?.codespaceId || app?.slug || id;

    try {
      const response = await fetch(`/api/apps/${appIdentifier}/bin/restore`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to restore app");
      }

      // Optimistically remove from list
      setApps((prev) => prev.filter((a) => a.id !== id));
      toast.success(`"${app?.name}" restored successfully`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore app");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const app = apps.find((a) => a.id === id);
    const appIdentifier = app?.codespaceId || app?.slug || id;

    try {
      const response = await fetch(`/api/apps/${appIdentifier}/permanent?confirm=true`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete app");
      }

      // Optimistically remove from list
      setApps((prev) => prev.filter((a) => a.id !== id));
      toast.success(`"${app?.name}" permanently deleted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete app");
    }
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {apps.map((app) => (
          <BinAppCard
            key={app.id}
            app={app}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
