import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function MyAppsPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

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
          <Button size="lg" className="w-full sm:w-auto">
            Create New App
          </Button>
        </div>

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
                Click &ldquo;Create New App&rdquo; to start building with AI-powered development
              </p>
              <p className="text-xs">
                Full database integration coming soon
              </p>
            </div>
            <Button size="lg" variant="default">
              Create Your First App
            </Button>
          </CardContent>
        </Card>

        {/* Grid Layout (for when apps exist) */}
        <div className="mt-8 hidden">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* App cards will be rendered here */}
          </div>
        </div>
      </div>
    </div>
  )
}
