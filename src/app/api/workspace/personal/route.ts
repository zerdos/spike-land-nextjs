import { getPersonalWorkspaceId } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function GET() {
  const workspaceId = await getPersonalWorkspaceId();

  if (!workspaceId) {
    return NextResponse.json({ workspaceId: null }, { status: 200 });
  }

  return NextResponse.json({ workspaceId });
}
