import { SessionService } from "@/lib/codespace/session-service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { codeSpace: string } }
) {
  const { codeSpace } = params;
  const session = await SessionService.getSession(codeSpace);

  if (!session) {
    return NextResponse.json({ error: "Codespace not found" }, { status: 404 });
  }

  return NextResponse.json({ code: session.code });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { codeSpace: string } }
) {
  const { codeSpace } = params;
  const { code, hash } = await request.json();

  if (!code || !hash) {
    return NextResponse.json({ error: "Missing code or hash" }, { status: 400 });
  }

  const currentSession = await SessionService.getSession(codeSpace);
  if (!currentSession) {
    return NextResponse.json({ error: "Codespace not found" }, { status: 404 });
  }

  const newSession = { ...currentSession, code };
  const result = await SessionService.updateSession(codeSpace, newSession, hash);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, session: result.session },
      { status: result.error === "Conflict: Hash mismatch" ? 409 : 400 }
    );
  }

  return NextResponse.json({ success: true, session: result.session });
}
