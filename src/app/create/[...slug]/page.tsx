import { AppDisplay } from "@/components/create/app-display";
import { RelatedApps } from "@/components/create/related-apps";
import { StreamingApp } from "@/components/create/streaming-app";
import { getCreatedApp } from "@/lib/create/content-service";
import { CreatedAppStatus } from "@prisma/client";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join("/");

  // Fetch app if exists to get real title
  const app = await getCreatedApp(path);

  return {
    title: app?.title ? `${app.title} | Spike Land AI` : `Create ${path} | Spike Land AI`,
    description: app?.description || `Generate a React app for ${path}`,
  };
}

export default async function CreatePage({ params }: PageProps) {
  const { slug: pathSegments } = await params;

  if (!pathSegments || pathSegments.length === 0) {
    notFound();
  }

  const slug = pathSegments.join("/");
  const app = await getCreatedApp(slug);

  // If app is published, show it
  if (app && app.status === CreatedAppStatus.PUBLISHED) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <AppDisplay
            url={app.codespaceUrl}
            title={app.title}
            slug={app.slug}
          />
        </div>
        <RelatedApps links={app.outgoingLinks} />
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
