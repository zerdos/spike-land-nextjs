"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Safety net: if middleware didn't catch this route, redirect to /g/
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    if (pathname && pathname !== "/" && !pathname.startsWith("/g/")) {
      router.replace(`/g${pathname}`);
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Redirecting...</p>
      </div>
    </div>
  );
}
