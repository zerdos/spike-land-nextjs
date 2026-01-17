import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BinPageClient } from "./client";

const RETENTION_DAYS = 30;

export const dynamic = "force-dynamic";

export default async function BinPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  const apps = await prisma.app.findMany({
    where: {
      userId: session.user.id,
      deletedAt: { not: null },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      status: true,
      codespaceId: true,
      codespaceUrl: true,
      deletedAt: true,
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
      deletedAt: "desc",
    },
  });

  // Calculate days remaining for each app
  const now = new Date();
  const appsWithRetention = apps.map((app) => {
    const deletedAt = app.deletedAt as Date;
    const daysSinceDeleted = Math.floor(
      (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = Math.max(0, RETENTION_DAYS - daysSinceDeleted);

    return {
      ...app,
      deletedAt: deletedAt.toISOString(),
      daysRemaining,
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-24 pb-8 md:pb-12">
        {/* Back link */}
        <Link
          href="/my-apps"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Apps
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Bin
          </h1>
          <p className="mt-2 text-muted-foreground">
            Apps are permanently deleted after {RETENTION_DAYS} days
          </p>
        </div>

        {apps.length === 0
          ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 py-16">
              <div className="mb-4 rounded-full bg-zinc-900 p-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-500"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </div>
              <h2 className="mb-1 text-lg font-medium text-zinc-300">
                Bin is empty
              </h2>
              <p className="text-sm text-zinc-500">
                Deleted apps will appear here
              </p>
            </div>
          )
          : <BinPageClient apps={appsWithRetention} />}
      </div>
    </div>
  );
}
