/**
 * Relay Page
 *
 * Main page for the Relay module showing the approval queue.
 * Resolves #872
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { RelayPageClient } from "./relay-page-client";

interface RelayPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function RelayPage({ params }: RelayPageProps) {
  const { workspaceSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return <RelayPageClient workspaceSlug={workspaceSlug} />;
}
