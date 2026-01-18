/**
 * Social Accounts Settings Page
 *
 * Manage connected social media accounts for the workspace.
 */

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SocialAccountsClient } from "./SocialAccountsClient";

interface AccountsPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function AccountsPage({ params }: AccountsPageProps) {
  const { workspaceSlug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  // Fetch workspace details
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
        <h1 className="text-3xl font-bold tracking-tight">Social Accounts</h1>
        <p className="text-muted-foreground">
          Connect and manage your social media accounts
        </p>
      </div>

      <SocialAccountsClient
        workspaceSlug={workspaceSlug}
        workspaceId={workspace.id}
      />
    </div>
  );
}
