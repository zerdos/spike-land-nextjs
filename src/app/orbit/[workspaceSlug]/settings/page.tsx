import { auth } from "@/auth";
import { GeneralSettingsForm } from "@/components/orbit/settings/general-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import prisma from "@/lib/prisma";
import { CheckSquare, ChevronRight, Inbox, Link2, Shield, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

interface SettingsPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
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
      description: true,
    },
  });

  if (!workspace) {
    redirect("/orbit");
  }

  const settingsLinks = [
    {
      href: `settings/accounts`,
      icon: Link2,
      title: "Social Accounts",
      description: "Connect and manage your social media accounts",
    },
    {
      href: `settings/inbox/routing`,
      icon: Inbox,
      title: "Inbox Smart Routing",
      description: "Configure AI-powered analysis and priority scoring",
    },
    {
      href: `settings/approvals`,
      icon: CheckSquare,
      title: "Approval Workflow",
      description: "Configure response approval settings and approver roles",
    },
    {
      href: `settings/members`,
      icon: Users,
      title: "Team Members",
      description: "Manage workspace members and roles",
      comingSoon: true,
    },
    {
      href: `settings/policies`,
      icon: Shield,
      title: "Content Policies",
      description: "Set up content guidelines and approval rules",
      comingSoon: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Basic workspace information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GeneralSettingsForm
            workspaceId={workspace.id}
            initialName={workspace.name}
            initialDescription={workspace.description}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* Settings Navigation */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">More Settings</h2>
        <div className="grid gap-4">
          {settingsLinks.map((link) =>
            link.comingSoon
              ? (
                <div
                  key={link.href}
                  className="flex items-center justify-between rounded-lg border p-4 cursor-not-allowed opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <link.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{link.title}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Coming Soon
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                  </div>
                </div>
              )
              : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <link.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium">{link.title}</span>
                      <p className="text-sm text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              )
          )}
        </div>
      </div>
    </div>
  );
}
