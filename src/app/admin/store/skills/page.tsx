/**
 * Admin Skill Store Dashboard
 *
 * Overview of skills, install metrics, and management.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import type { SkillCategory, SkillStatus } from "@prisma/client";
import { Download, Package, Star, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SkillRow {
  id: string;
  displayName: string;
  slug: string;
  category: SkillCategory;
  status: SkillStatus;
  installCount: number;
  isFeatured: boolean;
  updatedAt: string;
  installationCount: number;
  featureCount: number;
}

async function getSkillMetrics() {
  const [
    totalSkills,
    publishedSkills,
    featuredSkills,
    totalInstalls,
    skills,
  ] = await Promise.all([
    prisma.skill.count(),
    prisma.skill.count({ where: { status: "PUBLISHED" } }),
    prisma.skill.count({ where: { isFeatured: true } }),
    prisma.skill.aggregate({ _sum: { installCount: true } }),
    prisma.skill.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { installations: true } },
        features: { select: { id: true } },
      },
    }),
  ]);

  return {
    totalSkills,
    publishedSkills,
    featuredSkills,
    totalInstalls: totalInstalls._sum.installCount || 0,
    skills: skills.map(
      (skill): SkillRow => ({
        id: skill.id,
        displayName: skill.displayName,
        slug: skill.slug,
        category: skill.category,
        status: skill.status,
        installCount: skill.installCount,
        isFeatured: skill.isFeatured,
        updatedAt: skill.updatedAt.toISOString(),
        installationCount: skill._count.installations,
        featureCount: skill.features.length,
      }),
    ),
  };
}

function getStatusBadgeVariant(
  status: SkillStatus,
): "warning" | "success" | "default" {
  const variants: Record<SkillStatus, "warning" | "success" | "default"> = {
    DRAFT: "warning",
    PUBLISHED: "success",
    ARCHIVED: "default",
  };
  return variants[status];
}

function getCategoryLabel(category: SkillCategory): string {
  const labels: Record<SkillCategory, string> = {
    QUALITY: "Quality",
    TESTING: "Testing",
    WORKFLOW: "Workflow",
    SECURITY: "Security",
    PERFORMANCE: "Performance",
    OTHER: "Other",
  };
  return labels[category];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminSkillStorePage() {
  const metrics = await getSkillMetrics();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skill Store Dashboard</h1>
          <p className="text-muted-foreground">
            Manage skills, track installs, and curate featured content
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/store/skills/new">Add Skill</Link>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSkills}</div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.publishedSkills}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalSkills - metrics.publishedSkills} draft or archived
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Featured</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.featuredSkills}</div>
            <p className="text-xs text-muted-foreground">
              Highlighted in the store
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Installs
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalInstalls.toLocaleString("en-GB")}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all skills
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Skills Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.skills.length === 0
            ? (
              <p className="text-muted-foreground text-center py-8">
                No skills yet. Add your first skill to get started.
              </p>
            )
            : (
              <div className="space-y-3">
                {metrics.skills.map((skill) => (
                  <Link
                    key={skill.id}
                    href={`/admin/store/skills/${skill.slug}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium truncate">
                          {skill.displayName}
                        </span>
                        <Badge variant={getStatusBadgeVariant(skill.status)}>
                          {skill.status}
                        </Badge>
                        <Badge variant="outline">
                          {getCategoryLabel(skill.category)}
                        </Badge>
                        {skill.isFeatured && (
                          <Badge variant="secondary">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {skill.installCount.toLocaleString("en-GB")}{" "}
                        install{skill.installCount !== 1 ? "s" : ""}{" "}
                        · {skill.featureCount}{" "}
                        feature{skill.featureCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(skill.updatedAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
