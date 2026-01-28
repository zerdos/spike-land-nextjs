/**
 * Approval Settings Page
 *
 * Settings page for configuring Relay approval workflows.
 * Resolves #872
 */

import { auth } from "@/auth";
import { ApprovalSettingsForm } from "@/components/orbit/settings/approval-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

interface ApprovalSettingsPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function ApprovalSettingsPage({
  params,
}: ApprovalSettingsPageProps) {
  const { workspaceSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  // Verify user has access to this workspace
  const workspace = await prisma.workspace.findFirst({
    where: {
      slug: workspaceSlug,
      members: {
        some: {
          userId: session.user.id,
          role: {
            in: ["OWNER", "ADMIN"],
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!workspace) {
    redirect(`/orbit/${workspaceSlug}`);
  }

  return (
    <div className="space-y-6" data-testid="approval-settings-page">
      {/* Header */}
      <div>
        <Link
          href={`/orbit/${workspaceSlug}/settings`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          data-testid="back-link"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Approval Settings</h1>
        <p className="text-muted-foreground">
          Configure how drafts are reviewed and approved before publishing
        </p>
      </div>

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle>Relay Approval Configuration</CardTitle>
          <CardDescription>
            Customize the approval workflow for AI-generated response drafts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApprovalSettingsForm workspaceSlug={workspaceSlug} />
        </CardContent>
      </Card>
    </div>
  );
}
