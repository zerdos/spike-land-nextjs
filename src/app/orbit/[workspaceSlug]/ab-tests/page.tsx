/**
 * A/B Testing Dashboard
 *
 * Manage and monitor social post A/B tests.
 * Resolves #840
 */

import { auth } from "@/auth";
import { AbTestsList } from "@/components/orbit/ab-tests/AbTestsList";
import { CreateAbTestDialog } from "@/components/orbit/ab-tests/CreateAbTestDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

interface AbTestsPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function AbTestsPage({ params }: AbTestsPageProps) {
  const { workspaceSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  // Fetch workspace
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
      subscriptionTier: true,
      maxAbTests: true,
    },
  });

  if (!workspace) {
    redirect("/orbit");
  }

  // Fetch active tests count
  const activeTestsCount = await prisma.socialPostAbTest.count({
    where: {
      workspaceId: workspace.id,
      status: { in: ["DRAFT", "RUNNING"] },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">A/B Tests</h1>
          <p className="text-muted-foreground">
            Test variations of your social posts to optimize engagement
          </p>
        </div>
        <CreateAbTestDialog workspaceSlug={workspaceSlug} />
      </div>

      {/* Subscription Limits Card */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Limits</CardTitle>
          <CardDescription>
            Your current plan: {workspace.subscriptionTier}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{activeTestsCount}</span>
            <span className="text-muted-foreground">
              / {workspace.maxAbTests} active tests
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tests List */}
      <AbTestsList workspaceSlug={workspaceSlug} />
    </div>
  );
}
