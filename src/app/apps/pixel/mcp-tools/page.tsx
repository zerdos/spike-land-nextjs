import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { McpToolsClient } from "./McpToolsClient";

export const metadata = {
  title: "MCP Tools - Spike Land",
  description: "Test and explore the MCP API for image generation and modification",
};

export default async function McpToolsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return <McpToolsClient />;
}
