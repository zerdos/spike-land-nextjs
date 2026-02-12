"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useVibeCode } from "./vibe-code-provider";

export function VibeCodeFAB() {
  const { openPanel, isOpen } = useVibeCode();
  const { data: session } = useSession();

  if (isOpen) return null;

  const handleClick = () => {
    if (!session) {
      signIn();
    } else {
      openPanel();
    }
  };

  return (
    <Button
      onClick={handleClick}
      size="lg"
      className="fixed bottom-6 right-6 lg:right-[19.5rem] z-50 rounded-full shadow-lg h-12 px-4 gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0"
    >
      <Sparkles className="w-5 h-5" />
      <span className="hidden sm:inline">Vibe Code</span>
    </Button>
  );
}
