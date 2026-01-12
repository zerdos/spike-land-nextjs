"use client";

import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useEffect } from "react";

// Word lists for generating random codespace IDs
const ADJECTIVES = [
  "swift",
  "bright",
  "cosmic",
  "digital",
  "clever",
  "stellar",
  "nimble",
  "sleek",
  "vibrant",
  "dynamic",
  "agile",
  "bold",
  "smart",
  "rapid",
  "fresh",
];
const NOUNS = [
  "forge",
  "spark",
  "wave",
  "pulse",
  "flow",
  "nexus",
  "orbit",
  "prism",
  "grid",
  "core",
  "hub",
  "vault",
  "bridge",
  "beacon",
  "studio",
];
const VERBS = [
  "launch",
  "build",
  "craft",
  "sync",
  "boost",
  "stream",
  "dash",
  "snap",
  "blend",
  "shift",
  "link",
  "push",
  "rise",
  "glow",
  "zoom",
];

function generateCodespaceId(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const verb = VERBS[Math.floor(Math.random() * VERBS.length)];
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${adj}.${noun}.${verb}.${suffix}`;
}

export default function NewAppPage() {
  const router = useRouter();

  useEffect(() => {
    // Generate a random ID and redirect immediately to the temp workspace
    const tempId = generateCodespaceId();
    router.replace(`/my-apps/new/${tempId}`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground">Initializing workspace...</p>
      </div>
    </div>
  );
}
