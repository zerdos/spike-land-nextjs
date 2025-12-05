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
import prisma from "@/lib/prisma";
import Link from "next/link";
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
        not: "DELETED",
      },
    },
    include: {
      requirements: true,
      monetizationModels: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
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
                  <Badge variant="outline" className="cursor-not-allowed opacity-50">
                    All
                  </Badge>
                  <Badge variant="outline" className="cursor-not-allowed opacity-50">
                    Active
                  </Badge>
                  <Badge variant="outline" className="cursor-not-allowed opacity-50">
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
                  <Badge variant="outline" className="cursor-not-allowed opacity-50">
                    All ({apps.length})
                  </Badge>
                  <Badge variant="outline" className="cursor-not-allowed opacity-50">
                    Active ({apps.filter((app: { status: string; }) => app.status === "ACTIVE")
                      .length})
                  </Badge>
                  <Badge variant="outline" className="cursor-not-allowed opacity-50">
                    Draft ({apps.filter((app: { status: string; }) => app.status === "DRAFT")
                      .length})
                  </Badge>
                </div>
              </div>

              {/* Grid Layout */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {apps.map((app: {
                  id: string;
                  name: string;
                  description: string | null;
                  status: string;
                  createdAt: Date;
                  requirements: Array<{ id: string; }>;
                  monetizationModels: Array<{ id: string; type: string; }>;
                }) => (
                  <Card key={app.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl">{app.name}</CardTitle>
                        <Badge variant={app.status === "ACTIVE" ? "default" : "secondary"}>
                          {app.status}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {app.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-semibold">Requirements:</span>{" "}
                          {app.requirements.length}
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold">Monetization:</span>{" "}
                          {app.monetizationModels[0]?.type || "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Button variant="outline" className="flex-1" size="sm">
                        View
                      </Button>
                      <Button variant="default" className="flex-1" size="sm">
                        Edit
                      </Button>
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
