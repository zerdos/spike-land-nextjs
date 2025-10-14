"use client";

import { useSession } from "next-auth/react";
import { AuthButtons } from "./auth-buttons";
import { UserAvatar } from "./user-avatar";

export function AuthHeader() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
      </div>
    );
  }

  if (session) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <UserAvatar />
      </div>
    );
  }

  return null;
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
