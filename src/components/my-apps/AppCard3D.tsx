"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { APP_BUILD_STATUSES } from "@/lib/validations/app";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

interface AppData {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  status: (typeof APP_BUILD_STATUSES)[number];
  codespaceId: string | null;
  codespaceUrl: string | null;
  _count: {
    messages: number;
    images: number;
  };
  updatedAt: Date;
}

interface AppCard3DProps {
  app: AppData;
}

export function AppCard3D({ app }: AppCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-150, 150], [8, -8]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(x, [-150, 150], [-8, 8]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  // Viewport dimensions for dynamic iframe scaling
  const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  // Track viewport and container sizes for dynamic iframe scaling
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

    // Initial measurements
    updateViewportSize();
    updateContainerSize();

    // Listen for resize events
    window.addEventListener("resize", updateViewportSize);
    window.addEventListener("resize", updateContainerSize);

    // Use ResizeObserver for container size changes
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

  // Calculate dynamic scale to fit browser-sized content into container
  const iframeScale = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return 0.25; // fallback
    }
    const scaleX = containerSize.width / viewportSize.width;
    const scaleY = containerSize.height / viewportSize.height;
    return Math.min(scaleX, scaleY);
  }, [containerSize.width, containerSize.height, viewportSize.width, viewportSize.height]);

  // Use codespaceId for the URL (preferred), fall back to slug, then id for backward compat
  const appIdentifier = app.codespaceId || app.slug || app.id;

  return (
    <Link href={`/my-apps/${appIdentifier}`}>
      <motion.div
        ref={cardRef}
        layoutId={`app-card-${appIdentifier}`}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          aspectRatio: `${viewportSize.width} / ${viewportSize.height}`,
        }}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-sm"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
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
                    opacity: iframeLoaded ? 1 : 0,
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto mb-2 opacity-50"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <p className="text-sm">No preview</p>
                </div>
              </div>
            )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          {app.description && (
            <p className="line-clamp-3 text-sm text-zinc-300">
              {app.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
            <span>{app._count.messages} messages</span>
            <span>{app._count.images} images</span>
          </div>
        </div>

        {/* 3D shine effect on hover */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background: isHovered
              ? "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1), transparent 60%)"
              : "none",
          }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Border glow on hover */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            boxShadow: isHovered
              ? "inset 0 0 0 1px rgba(0, 229, 255, 0.3), 0 0 30px rgba(0, 229, 255, 0.1)"
              : "none",
          }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </Link>
  );
}
