/**
 * Scout Benchmarks Page
 *
 * Industry benchmark comparisons showing your metrics vs industry average
 * with trend charts.
 *
 * Resolves #870
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BenchmarksClient } from "./BenchmarksClient";

interface BenchmarksPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function BenchmarksPage({ params }: BenchmarksPageProps) {
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

  // Fetch competitor count for context
  const competitorCount = await prisma.scoutCompetitor.count({
    where: { workspaceId: workspace.id, isActive: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Benchmarks</h1>
        <p className="text-muted-foreground">
          Compare your performance against competitors and industry standards
        </p>
      </div>

      <BenchmarksClient
        workspaceSlug={workspaceSlug}
        competitorCount={competitorCount}
      />
    </div>
  );
}
