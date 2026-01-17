"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppBuildStatus } from "@prisma/client";
import { motion } from "framer-motion";
import { RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

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

interface BinAppCardProps {
  app: BinAppData;
  onRestore: (id: string) => Promise<void>;
  onPermanentDelete: (id: string) => Promise<void>;
}

export function BinAppCard({ app, onRestore, onPermanentDelete }: BinAppCardProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"restore" | "delete" | null>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    const updateContainerSize = () => {
      if (iframeContainerRef.current) {
        const { clientWidth, clientHeight } = iframeContainerRef.current;
        setContainerSize({ width: clientWidth, height: clientHeight });
      }
    };

    updateViewportSize();
    updateContainerSize();

    window.addEventListener("resize", updateViewportSize);
    window.addEventListener("resize", updateContainerSize);

    const resizeObserver = new ResizeObserver(updateContainerSize);
    if (iframeContainerRef.current) {
      resizeObserver.observe(iframeContainerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateViewportSize);
      window.removeEventListener("resize", updateContainerSize);
      resizeObserver.disconnect();
    };
  }, []);

  const iframeScale = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return 0.25;
    }
    const scaleX = containerSize.width / viewportSize.width;
    const scaleY = containerSize.height / viewportSize.height;
    return Math.min(scaleX, scaleY);
  }, [containerSize.width, containerSize.height, viewportSize.width, viewportSize.height]);

  const handleRestore = () => {
    setAction("restore");
    startTransition(async () => {
      await onRestore(app.id);
      setAction(null);
    });
  };

  const handleDelete = () => {
    setAction("delete");
    startTransition(async () => {
      await onPermanentDelete(app.id);
      setAction(null);
    });
  };

  const deletedDate = new Date(app.deletedAt);
  const isUrgent = app.daysRemaining <= 7;
  const isCritical = app.daysRemaining <= 3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        aspectRatio: `${viewportSize.width} / ${viewportSize.height}`,
      }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-sm"
    >
      {/* Live iframe preview */}
      <div ref={iframeContainerRef} className="absolute inset-0">
        {app.codespaceUrl
          ? (
            <>
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <Skeleton className="h-full w-full" />
                </div>
              )}
              <iframe
                src={app.codespaceUrl}
                className="pointer-events-none border-0"
                style={{
                  width: `${viewportSize.width}px`,
                  height: `${viewportSize.height}px`,
                  transform: `scale(${iframeScale})`,
                  transformOrigin: "0 0",
                  opacity: iframeLoaded ? 0.5 : 0,
                  filter: "grayscale(50%)",
                }}
                title={`Preview of ${app.name}`}
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
                onLoad={() => setIframeLoaded(true)}
              />
            </>
          )
          : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
              <div className="text-center text-zinc-600">
                <Trash2 className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p className="text-sm">In Bin</p>
              </div>
            </div>
          )}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent" />

      {/* Days remaining badge */}
      <div className="absolute right-3 top-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isCritical
              ? "animate-pulse bg-red-500/90 text-white"
              : isUrgent
              ? "bg-yellow-500/90 text-black"
              : "bg-zinc-700/90 text-zinc-300"
          }`}
        >
          {app.daysRemaining} {app.daysRemaining === 1 ? "day" : "days"} left
        </span>
      </div>

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="mb-1 truncate text-lg font-semibold text-white">
          {app.name}
        </h3>
        {app.description && (
          <p className="mb-2 line-clamp-2 text-sm text-zinc-400">
            {app.description}
          </p>
        )}
        <p className="mb-3 text-xs text-zinc-500">
          Deleted {deletedDate.toLocaleDateString()}
        </p>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={handleRestore}
            disabled={isPending}
          >
            {isPending && action === "restore"
              ? <span className="animate-spin">⏳</span>
              : (
                <>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Restore
                </>
              )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                disabled={isPending}
              >
                {isPending && action === "delete"
                  ? <span className="animate-spin">⏳</span>
                  : (
                    <>
                      <Trash2 className="mr-1 h-4 w-4" />
                      Delete Forever
                    </>
                  )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Permanently delete &ldquo;{app.name}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the app and all its
                  data, including {app._count.messages} messages and {app._count.images} images.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  );
}
