"use client";

import { PixelLogo } from "@/components/brand";
import { AlbumsGrid } from "@/components/enhance/AlbumsGrid";
import { AlbumsGridSkeleton } from "@/components/enhance/AlbumsGridSkeleton";
import { CreateAlbumDialog } from "@/components/enhance/CreateAlbumDialog";
import { TokenDisplay } from "@/components/tokens/TokenDisplay";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { useUserAlbums } from "@/hooks/useUserAlbums";
import type { EnhancedImage, ImageEnhancementJob } from "@prisma/client";
import { Settings2 } from "lucide-react";
import { useTransitionRouter as useRouter } from "next-view-transitions";

interface EnhancePageClientProps {
  images: (EnhancedImage & {
    enhancementJobs: ImageEnhancementJob[];
  })[];
}

function EnhancePageContent(_props: EnhancePageClientProps) {
  const router = useRouter();
  const { albums, isLoading: albumsLoading, refetch: refetchAlbums } = useUserAlbums();

  const handleAlbumCreated = () => {
    refetchAlbums();
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <PixelLogo size="lg" />
            <span className="text-muted-foreground text-lg hidden sm:inline">
              AI Image Enhancement
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/apps/pixel/pipelines">
                <Settings2 className="h-4 w-4 mr-2" />
                Pipelines
              </Link>
            </Button>
            <TokenDisplay />
          </div>
        </div>

        {/* Albums Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              Your Albums
            </h2>
            <CreateAlbumDialog onAlbumCreated={handleAlbumCreated} />
          </div>
          {albumsLoading
            ? <AlbumsGridSkeleton count={3} />
            : albums.length === 0
            ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No albums yet. Create one to organize your images!</p>
              </div>
            )
            : (
              <AlbumsGrid
                albums={albums.map((album) => ({
                  ...album,
                  createdAt: new Date(album.createdAt),
                }))}
                onAlbumClick={(albumId) => router.push(`/albums/${albumId}`)}
              />
            )}
        </div>

        {/* Getting Started Tutorial */}
        <div className="rounded-xl border border-border/50 bg-muted/30 p-6">
          <h3 className="text-lg font-semibold mb-4">How to Upload Images</h3>
          <ol className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                1
              </span>
              <span>
                Create an album using the{" "}
                <strong className="text-foreground">
                  &quot;New Album&quot;
                </strong>{" "}
                button above
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                2
              </span>
              <span>Open your album by clicking on it</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                3
              </span>
              <span>
                Drag and drop images into the album, or use the upload button
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export function EnhancePageClient(props: EnhancePageClientProps) {
  return <EnhancePageContent {...props} />;
}
