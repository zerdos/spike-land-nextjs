"use client";

import { usePathname } from "next/navigation";
import { PixelAppHeader } from "./PixelAppHeader";
import { PlatformHeader } from "./PlatformHeader";

const EXCLUDED_PATHS = [
  "/canvas",
  "/storybook",
  "/admin",
  "/orbit",
  "/learnit",
  "/personas",
  "/auth",
  "/live",
  "/create",
  "/apps/audio-mixer",
];

// Check if pathname is a child route of /apps/pixel (but not /apps/pixel itself)
function isPixelAppChildRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  // Match /apps/pixel/something but not /apps/pixel
  return pathname.startsWith("/apps/pixel/") && pathname !== "/apps/pixel";
}

export function ConditionalHeader() {
  const pathname = usePathname();

  // Allow /orbit-landing through before checking excluded paths
  // (since "/orbit" in EXCLUDED_PATHS would match "/orbit-landing" via startsWith)
  if (pathname?.startsWith("/orbit-landing")) {
    return <PlatformHeader />;
  }

  const shouldHide = EXCLUDED_PATHS.some((path) => pathname?.startsWith(path));

  if (shouldHide) {
    return null;
  }

  // Show PixelAppHeader for /apps/pixel/* child routes
  if (isPixelAppChildRoute(pathname)) {
    return <PixelAppHeader />;
  }

  return <PlatformHeader />;
}
