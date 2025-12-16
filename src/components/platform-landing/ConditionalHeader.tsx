"use client";

import { usePathname } from "next/navigation";
import { PlatformHeader } from "./PlatformHeader";

const EXCLUDED_PATHS = ["/canvas", "/storybook"];

export function ConditionalHeader() {
  const pathname = usePathname();

  // Hide on canvas and storybook pages
  const shouldHide = EXCLUDED_PATHS.some((path) => pathname?.startsWith(path));

  if (shouldHide) {
    return null;
  }

  return <PlatformHeader />;
}
