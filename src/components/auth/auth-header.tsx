"use client";

import { ModeToggle } from "@/components/theme/mode-toggle";
import { useSession } from "next-auth/react";
import { AuthButtons } from "./auth-buttons";
import { UserAvatar } from "./user-avatar";

export function AuthHeader() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
        <ModeToggle />
      </div>
    );
  }

  if (session) {
    return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <UserAvatar />
        <ModeToggle />
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <ModeToggle />
    </div>
  );
}

export function AuthSection() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (!session) {
    return <AuthButtons className="w-full max-w-sm mx-auto" />;
  }

  return null;
}
