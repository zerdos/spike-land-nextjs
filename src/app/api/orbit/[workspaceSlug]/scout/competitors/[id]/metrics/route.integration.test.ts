import prisma from "@/lib/prisma";
import { SocialPlatform } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET } from "./route";

describe("Competitor Metrics API", () => {
  let workspace: any;
  let competitor: any;

  beforeAll(async () => {
    workspace = await prisma.workspace.create({
      data: {
        name: "Test Metrics Workspace",
        slug: `test-metrics-ws-${Date.now()}`,
      },
    });
    competitor = await prisma.scoutCompetitor.create({
      data: {
        workspaceId: workspace.id,
        platform: SocialPlatform.TWITTER,
        handle: "metricstest",
      },
    });
    await prisma.scoutCompetitorPost.createMany({
      data: [
        {
          competitorId: competitor.id,
          platformPostId: "p1",
          content: "Post 1",
          postedAt: new Date(),
          likes: 100,
        },
        {
          competitorId: competitor.id,
          platformPostId: "p2",
          content: "Post 2",
          postedAt: new Date(),
          likes: 200,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.scoutCompetitorPost.deleteMany({ where: { competitorId: competitor.id } });
    await prisma.scoutCompetitor.deleteMany({ where: { workspaceId: workspace.id } });
    await prisma.workspace.delete({ where: { id: workspace.id } });
  });

  it("should fetch engagement metrics for a competitor", async () => {
    const req = new NextRequest(
      `http://localhost/api/orbit/${workspace.slug}/scout/competitors/${competitor.id}/metrics`,
    );
    const res = await GET(req, { params: { workspaceSlug: workspace.slug, id: competitor.id } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.engagementMetrics.totalPosts).toBe(2);
    expect(data.engagementMetrics.averageLikes).toBe(150);
    expect(data.topPosts.length).toBe(2);
    expect(data.topPosts[0].likes).toBe(200);
  });
});
