/**
 * Scout Landing Page
 *
 * Main dashboard for competitor tracking and market intelligence.
 * Provides overview cards, quick actions, and recent activity feed.
 *
 * Resolves #870
 */

import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import prisma from "@/lib/prisma";
import { BarChart3, ChevronRight, Eye, Hash, Plus, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

interface ScoutPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function ScoutPage({ params }: ScoutPageProps) {
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

  // Fetch counts for overview cards
  const [competitorCount, topicCount] = await Promise.all([
    prisma.scoutCompetitor.count({
      where: { workspaceId: workspace.id, isActive: true },
    }),
    prisma.scoutTopic.count({
      where: { workspaceId: workspace.id, isActive: true },
    }),
  ]);

  // Fetch recent scout results for activity feed
  const recentResults = await prisma.scoutResult.findMany({
    where: {
      topic: {
        workspaceId: workspace.id,
      },
    },
    include: {
      topic: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      foundAt: "desc",
    },
    take: 5,
  });

  const scoutLinks = [
    {
      href: `competitors`,
      icon: Users,
      title: "Competitors",
      description: "Track and analyze competitor accounts",
      count: competitorCount,
    },
    {
      href: `topics`,
      icon: Hash,
      title: "Topics",
      description: "Monitor keywords and trending topics",
      count: topicCount,
    },
    {
      href: `benchmarks`,
      icon: BarChart3,
      title: "Benchmarks",
      description: "Compare your performance against industry standards",
    },
  ];

  const quickActions = [
    {
      href: `competitors`,
      icon: Plus,
      label: "Add Competitor",
    },
    {
      href: `topics`,
      icon: Plus,
      label: "Add Topic",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scout</h1>
          <p className="text-muted-foreground">
            Track competitors and monitor market intelligence
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Competitors Tracked
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competitorCount}</div>
            <p className="text-xs text-muted-foreground">
              Active competitor accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Topics Monitored
            </CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topicCount}</div>
            <p className="text-xs text-muted-foreground">
              Keywords being tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Benchmark Status
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {competitorCount > 0 ? "Active" : "Pending"}
            </div>
            <p className="text-xs text-muted-foreground">
              {competitorCount > 0
                ? "Comparing against competitors"
                : "Add competitors to start"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with competitor tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Scout Navigation */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Scout Modules</h2>
        <div className="grid gap-4">
          {scoutLinks.map((link) => (
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{link.title}</span>
                    {link.count !== undefined && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {link.count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {link.description}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      <Separator />

      {/* Recent Activity Feed */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <Card>
          <CardContent className="pt-6">
            {recentResults.length === 0
              ? (
                <div className="text-center py-8">
                  <Eye className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">No activity yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Start by adding competitors or topics to monitor
                  </p>
                </div>
              )
              : (
                <div className="space-y-4">
                  {recentResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="rounded-lg bg-muted p-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.topic.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {result.platform}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.content}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {result.author} - {result.foundAt
                            ? new Date(result.foundAt).toLocaleDateString()
                            : "Unknown date"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
