import { ExitIntentDetector } from "@/components/create/exit-intent-detector";
import { FeedbackTimer } from "@/components/create/feedback-timer";
import { LiveAppDisplay } from "@/components/create/live-app-display";
import { RelatedApps } from "@/components/create/related-apps";
import { StreamingApp } from "@/components/create/streaming-app";
import { getCreatedApp, getRelatedPublishedApps } from "@/lib/create/content-service";
import { CreatedAppStatus } from "@prisma/client";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Force dynamic rendering to avoid static analysis issues with catch-all params
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  // Defensive check for static analysis - slug may be undefined during build
  if (!slug || !Array.isArray(slug) || slug.length === 0) {
    return { title: "Create | Spike Land AI" };
  }

  const path = slug.join("/");

  // Fetch app if exists to get real title
  const app = await getCreatedApp(path);

  return {
    title: app?.title ? `${app.title} | Spike Land AI` : `Create ${path} | Spike Land AI`,
    description: app?.description || `Generate a React app for ${path}`,
  };
}

export default async function CreatePage({ params }: PageProps) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams?.slug;

  if (!pathSegments || !Array.isArray(pathSegments) || pathSegments.length === 0) {
    notFound();
  }

  const slug = pathSegments.join("/");
  const [app, relatedApps] = await Promise.all([
    getCreatedApp(slug),
    getRelatedPublishedApps(slug, 6),
  ]);

  // If app is published, show it
  if (app && app.status === CreatedAppStatus.PUBLISHED && app.codespaceId && app.codespaceUrl) {
    return (
      <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <LiveAppDisplay
            codespaceId={app.codespaceId}
            codespaceUrl={app.codespaceUrl}
            title={app.title}
            slug={app.slug}
          />
        </div>
        <RelatedApps
          links={app.outgoingLinks}
          publishedApps={relatedApps}
        />
        <FeedbackTimer
          appSlug={app.slug}
          appTitle={app.title}
          codespaceId={app.codespaceId ?? undefined}
        />
        <ExitIntentDetector
          appSlug={app.slug}
          appTitle={app.title}
          codespaceId={app.codespaceId ?? undefined}
        />
      </div>
    );
  }

  // Otherwise (Generating, Failed, or New), show streaming UI
  return (
    <div className="min-h-screen bg-background">
      <StreamingApp path={pathSegments} />
    </div>
  );
}
