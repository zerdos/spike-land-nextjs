/**
 * Admin Storage API Route
 *
 * Provides R2 storage statistics for the admin system health page.
 */

import { auth } from "@/auth";
import { requireAdminByUserId } from "@/lib/auth/admin-middleware";
import { isR2Configured, listR2StorageStats } from "@/lib/storage/r2-client";
import { tryCatch } from "@/lib/try-catch";
import { NextResponse } from "next/server";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function GET() {
  const { data: session, error: authError } = await tryCatch(auth());

  if (authError) {
    console.error("Failed to fetch storage stats:", authError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: adminError } = await tryCatch(
    requireAdminByUserId(session.user.id),
  );

  if (adminError) {
    console.error("Failed to fetch storage stats:", adminError);
    if (adminError instanceof Error && adminError.message.includes("Forbidden")) {
      return NextResponse.json({ error: adminError.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Check if R2 is configured
  if (!isR2Configured()) {
    return NextResponse.json({
      totalFiles: 0,
      totalSizeBytes: 0,
      totalSizeFormatted: "0 B",
      averageSizeBytes: 0,
      averageSizeFormatted: "0 B",
      imageStats: {
        count: 0,
        sizeBytes: 0,
        sizeFormatted: "0 B",
      },
      byFileType: {},
      isConfigured: false,
    });
  }

  // Get storage statistics from R2
  const { data: result, error: statsError } = await tryCatch(listR2StorageStats());

  if (statsError) {
    console.error("Failed to fetch storage stats:", statsError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!result.success || !result.stats) {
    return NextResponse.json(
      { error: result.error || "Failed to fetch storage stats" },
      { status: 500 },
    );
  }

  const { stats } = result;

  // Calculate image-specific stats
  let imageCount = 0;
  let imageSizeBytes = 0;

  for (const ext of IMAGE_EXTENSIONS) {
    if (stats.byFileType[ext]) {
      imageCount += stats.byFileType[ext].count;
      imageSizeBytes += stats.byFileType[ext].sizeBytes;
    }
  }

  // Format byFileType with human-readable sizes
  const byFileTypeFormatted: Record<
    string,
    { count: number; sizeBytes: number; sizeFormatted: string; }
  > = {};

  for (const [ext, data] of Object.entries(stats.byFileType)) {
    byFileTypeFormatted[ext] = {
      count: data.count,
      sizeBytes: data.sizeBytes,
      sizeFormatted: formatBytes(data.sizeBytes),
    };
  }

  return NextResponse.json({
    totalFiles: stats.totalFiles,
    totalSizeBytes: stats.totalSizeBytes,
    totalSizeFormatted: formatBytes(stats.totalSizeBytes),
    averageSizeBytes: stats.averageSizeBytes,
    averageSizeFormatted: formatBytes(stats.averageSizeBytes),
    imageStats: {
      count: imageCount,
      sizeBytes: imageSizeBytes,
      sizeFormatted: formatBytes(imageSizeBytes),
    },
    byFileType: byFileTypeFormatted,
    isConfigured: true,
  });
}
