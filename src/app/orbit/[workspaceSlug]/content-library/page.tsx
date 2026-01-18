/**
 * Content Library Page
 *
 * Placeholder page for content library functionality.
 * Will be implemented with media management capabilities.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ContentLibraryPageProps {
  params: Promise<{ workspaceSlug: string; }>;
}

export default async function ContentLibraryPage({ params }: ContentLibraryPageProps) {
  const { workspaceSlug: _ } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Library</h1>
          <p className="text-muted-foreground">
            Manage and organize your media assets
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            The Content Library feature is currently under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium mb-2">Content Library</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Store, organize, and reuse your media assets including images, videos, and templates
              for your social media campaigns.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
