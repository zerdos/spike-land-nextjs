"use client";

import { usePathname } from "next/navigation";
import { PlatformHeader } from "./PlatformHeader";

const EXCLUDED_PATHS = ["/canvas", "/storybook", "/admin"];

export function ConditionalHeader() {
  const pathname = usePathname();

  const shouldHide = EXCLUDED_PATHS.some((path) => pathname?.startsWith(path));

  if (shouldHide) {
    return null;
  }

  return <PlatformHeader />;
}
