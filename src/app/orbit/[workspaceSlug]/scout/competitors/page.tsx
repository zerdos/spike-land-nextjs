/**
 * Scout Competitors Page
 *
 * Manage tracked competitor accounts with add/remove functionality,
 * metrics display, and filtering capabilities.
 *
 * Resolves #870
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CompetitorsClient } from "./CompetitorsClient";

interface CompetitorsPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function CompetitorsPage({ params }: CompetitorsPageProps) {
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
        <h1 className="text-3xl font-bold tracking-tight">Competitors</h1>
        <p className="text-muted-foreground">
          Track and analyze competitor social media accounts
        </p>
      </div>

      <CompetitorsClient workspaceSlug={workspaceSlug} />
    </div>
  );
}
