import { computeSessionHash } from "@/lib/codespace/hash-utils";
import { SessionService } from "@/lib/codespace/session-service";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ codeSpace: string }> }
) {
  const params = await props.params;
  const { codeSpace } = params;
  const session = await SessionService.getSession(codeSpace);

  if (!session) {
    return NextResponse.json({ success: false, error: "Codespace not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    codeSpace: session.codeSpace,
    hash: computeSessionHash(session),
    session: {
      code: session.code,
      transpiled: session.transpiled,
      html: session.html,
      css: session.css,
      codeSpace: session.codeSpace,
      messages: session.messages,
    },
  });
}
