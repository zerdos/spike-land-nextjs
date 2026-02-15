"use client";

import { usePathname } from "next/navigation";

export function FooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide footer on my-apps, live, create, connect, orbit (but not orbit-landing), and audio-mixer routes
  if (
    pathname?.startsWith("/my-apps") || pathname?.startsWith("/live") ||
    (pathname?.startsWith("/orbit") && !pathname?.startsWith("/orbit-landing")) ||
    pathname?.startsWith("/create") ||
    pathname?.startsWith("/connect") ||
    pathname?.startsWith("/apps/audio-mixer")
  ) {
    return null;
  }

  return <>{children}</>;
}
