import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function MyAppsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const apps = await prisma.app.findMany({
    where: {
      userId: session.user.id,
      status: {
        notIn: ["ARCHIVED"],
      },
    },
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
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-24 pb-8 md:pb-12">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              My Apps
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage and deploy your vibe-coded applications
            </p>
          </div>
          <Link href="/my-apps/new">
            <Button size="lg" className="w-full sm:w-auto">
              Create New App
            </Button>
          </Link>
        </div>

        {apps.length === 0
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
                    Get started by creating your first vibe-coded application
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 pb-8">
                  <div className="grid gap-2 text-center text-sm text-muted-foreground">
                    <p>
                      Click &ldquo;Create New App&rdquo; to start building with AI-powered
                      development
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
                    All ({apps.length})
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-not-allowed opacity-50"
                  >
                    Live ({apps.filter((app) => app.status === "LIVE").length})
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-not-allowed opacity-50"
                  >
                    Building ({apps.filter((app) =>
                      ["PROMPTING", "WAITING", "DRAFTING", "BUILDING", "FINE_TUNING", "TEST"]
                        .includes(app.status)
                    ).length})
                  </Badge>
                </div>
              </div>

              {/* Grid Layout */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {apps.map((app) => (
                  <Card key={app.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl">{app.name}</CardTitle>
                        <Badge
                          variant={app.status === "LIVE"
                            ? "default"
                            : app.status === "FAILED"
                            ? "destructive"
                            : "secondary"}
                        >
                          {app.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {app.description || "No description yet"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-semibold">Messages:</span> {app._count.messages}
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold">Images:</span> {app._count.images}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Updated {new Date(app.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Link href={`/my-apps/${app.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          View
                        </Button>
                      </Link>
                      {app.codespaceUrl && (
                        <Link
                          href={app.codespaceUrl}
                          target="_blank"
                          className="flex-1"
                        >
                          <Button variant="default" className="w-full" size="sm">
                            Preview
                          </Button>
                        </Link>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </>
          )}
      </div>
    </div>
  );
}
