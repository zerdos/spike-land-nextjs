/**
 * Orbit Layout
 *
 * Auth-only protection for Orbit pages.
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function OrbitLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  return <>{children}</>;
}
