/**
 * Scout Topics Page
 *
 * Manage tracked keywords and topics with add/remove functionality
 * and performance metrics.
 *
 * Resolves #870
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TopicsClient } from "./TopicsClient";

interface TopicsPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function TopicsPage({ params }: TopicsPageProps) {
  const { workspaceSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch workspace to verify access
  const workspace = await prisma.workspace.findFirst({
    where: {
      slug: workspaceSlug,
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!workspace) {
    redirect("/orbit");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
        <p className="text-muted-foreground">
          Monitor keywords and trending topics in your industry
        </p>
      </div>

      <TopicsClient workspaceSlug={workspaceSlug} />
    </div>
  );
}
