import prisma from "@/lib/prisma";
import { GeneratedRouteStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ generationId: string }> },
) {
  const { generationId } = await params;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let lastStatus = "";
      const maxPolls = 120; // 2 minutes at 1s intervals

      for (let i = 0; i < maxPolls; i++) {
        try {
          const route = await prisma.generatedRoute.findUnique({
            where: { id: generationId },
            select: {
              status: true,
              title: true,
              description: true,
              codespaceUrl: true,
              lastError: true,
              slug: true,
            },
          });

          if (!route) {
            send({ type: "error", message: "Route not found" });
            break;
          }

          if (route.status !== lastStatus) {
            lastStatus = route.status;
            send({ type: "status", phase: route.status, message: `Phase: ${route.status}` });
          }

          if (route.status === GeneratedRouteStatus.PUBLISHED) {
            send({
              type: "complete",
              slug: route.slug,
              codespaceUrl: route.codespaceUrl,
              title: route.title,
              description: route.description,
            });
            break;
          }

          if (route.status === GeneratedRouteStatus.FAILED) {
            send({ type: "error", message: route.lastError ?? "Generation failed", phase: "FAILED" });
            break;
          }

          // Heartbeat
          send({ type: "heartbeat", timestamp: Date.now() });
        } catch {
          send({ type: "error", message: "Stream error" });
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
