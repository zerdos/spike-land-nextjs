"use client";

import { useEffect } from "react";
import { useVibeCode } from "./vibe-code-provider";

interface VibeCodeActivatorProps {
  slug: string;
  title: string;
  codespaceId: string;
}

export function VibeCodeActivator({ slug, title, codespaceId }: VibeCodeActivatorProps) {
  const { setAppContext } = useVibeCode();

  useEffect(() => {
    setAppContext({ slug, title, codespaceId });
  }, [slug, title, codespaceId, setAppContext]);

  return null;
}
