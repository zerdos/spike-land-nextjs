"use client";

import type { CreatedApp } from "@prisma/client";
import { useVibeCode } from "./vibe-code-provider";
import { RelatedApps } from "./related-apps";
import { VibeCodePanel } from "./vibe-code-panel";

interface VibeCodeSidebarProps {
  links: string[];
  publishedApps?: CreatedApp[];
}

export function VibeCodeSidebar({ links, publishedApps }: VibeCodeSidebarProps) {
  const { isOpen } = useVibeCode();

  if (isOpen) {
    return <VibeCodePanel />;
  }

  return <RelatedApps links={links} publishedApps={publishedApps} />;
}
