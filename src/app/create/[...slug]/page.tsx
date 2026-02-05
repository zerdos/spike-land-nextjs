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

  if (!slug || !Array.isArray(slug) || slug.length === 0) {
    return { title: "Create | Spike Land AI" };
  }

  const path = slug.join("/");
  return {
    title: `Create ${path} | Spike Land AI`,
    description: `Generate a React app for ${path}`,
  };
}

export default async function CreatePage({ params }: PageProps) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams?.slug;

  if (!pathSegments || !Array.isArray(pathSegments) || pathSegments.length === 0) {
    notFound();
  }

  const slug = pathSegments.join("/");

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold">Creating: {slug}</h1>
      <p>This is a placeholder page.</p>
    </div>
  );
}
