import { auth } from "@/auth";
import { verifyAdminAccess } from "@/lib/auth/admin-middleware";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const hasAccess = await verifyAdminAccess(session);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { sessionId } = await params;
  const prisma = (await import("@/lib/prisma")).default;

  const agent = await prisma.claudeCodeAgent.findUnique({ where: { id: sessionId } });
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  await prisma.claudeCodeAgent.update({
    where: { id: sessionId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true, message: `Agent ${sessionId} killed.` });
}
