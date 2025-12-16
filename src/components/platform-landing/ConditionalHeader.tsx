"use client";

import { usePathname } from "next/navigation";
import { PixelAppHeader } from "./PixelAppHeader";
import { PlatformHeader } from "./PlatformHeader";

const EXCLUDED_PATHS = ["/canvas", "/storybook", "/admin"];

// Check if pathname is a child route of /apps/pixel (but not /apps/pixel itself)
function isPixelAppChildRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  // Match /apps/pixel/something but not /apps/pixel
  return pathname.startsWith("/apps/pixel/") && pathname !== "/apps/pixel";
}

export function ConditionalHeader() {
  const pathname = usePathname();

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
