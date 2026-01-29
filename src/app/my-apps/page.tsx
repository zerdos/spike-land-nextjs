import { auth } from "@/auth";
import { AppCatalog, UserStatsCard } from "@/components/my-apps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import prisma from "@/lib/prisma";
import { AppBuildStatus } from "@prisma/client";
import { redirect } from "next/navigation";

// Ensure this page is always dynamically rendered to show latest apps
export const dynamic = "force-dynamic";

export default async function MyAppsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined; }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams["page"]) || 1;
  const pageSize = 8;
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const where = {
    userId: session.user.id,
    deletedAt: null,
    status: {
      notIn: [AppBuildStatus.ARCHIVED],
    },
    messages: {
      some: {}, // Only show apps that have at least one message (i.e., not drafts)
    },
  };

  const [totalApps, apps] = await Promise.all([
    prisma.app.count({ where }),
    prisma.app.findMany({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        codespaceId: true,
        codespaceUrl: true,
        isCurated: true,
        isPublic: true,
        lastAgentActivity: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            messages: true,
            images: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  const totalPages = Math.ceil(totalApps / pageSize);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-24 pb-8 md:pb-12">
        {/* User Stats Card */}
        <UserStatsCard />

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              My Apps
            </h1>
            <p className="mt-2 text-muted-foreground">
              Build Custom Link-in-Bio Pages, Interactive Polls, and Campaign Microsites
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/my-apps/bin"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Button variant="ghost" size="sm" className="gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                Bin
              </Button>
            </Link>
            <Link href="/my-apps/new">
              <Button size="lg" className="w-full sm:w-auto">
                Create New App
              </Button>
            </Link>
          </div>
        </div>

        {apps.length === 0 && page === 1
          ? (
            <>
              {/* Search and Filter Bar - Disabled when no apps */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <input
                    type="search"
                    placeholder="Search apps..."
                    className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    disabled
                    aria-label="Search apps"
                  />
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className="cursor-not-allowed opacity-50"
                  >
                    All
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-not-allowed opacity-50"
                  >
                    Active
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-not-allowed opacity-50"
                  >
                    Draft
                  </Badge>
                </div>
              </div>

              {/* Empty State */}
              <Card className="border-dashed">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">No apps yet</CardTitle>
                  <CardDescription className="mt-2">
                    Create campaign tools like link-in-bio pages, landing pages, interactive polls, or contest entry forms
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 pb-8">
                  <div className="grid gap-2 text-center text-sm text-muted-foreground">
                    <p>
                      Choose from pre-built templates or start from scratch with AI-powered development
                    </p>
                  </div>
                  <Link href="/my-apps/new">
                    <Button size="lg" variant="default">
                      Create Your First App
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </>
          )
          : (
            <>
              {/* Search and Filter Bar */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <input
                    type="search"
                    placeholder="Search apps..."
                    className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    disabled
                    aria-label="Search apps"
                  />
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className="cursor-not-allowed opacity-50"
                  >
                    All ({totalApps})
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-not-allowed opacity-50"
                  >
                    Live ({apps.filter((app) => app.status === "LIVE").length})
                    {/* Note: Logic for count is simplified here for current page only. For total live, we'd need another query or accept it's approx. */}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-not-allowed opacity-50"
                  >
                    Building ({apps.filter((app) =>
                      [
                        "PROMPTING",
                        "WAITING",
                        "DRAFTING",
                        "BUILDING",
                        "FINE_TUNING",
                        "TEST",
                      ]
                        .includes(app.status)
                    ).length})
                  </Badge>
                </div>
              </div>

              {/* 3D Card Grid with Live Previews */}
              <AppCatalog apps={apps} />

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Link
                    href={`/my-apps?page=${page - 1}`}
                    className={page <= 1 ? "pointer-events-none" : ""}
                    aria-disabled={page <= 1}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>
                  <Link
                    href={`/my-apps?page=${page + 1}`}
                    className={page >= totalPages ? "pointer-events-none" : ""}
                    aria-disabled={page >= totalPages}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
}
