import { auth } from "@/auth";
import { McpToolsClient } from "./McpToolsClient";

export const metadata = {
  title: "MCP Tools - Spike Land",
  description: "Test and explore the MCP API for image generation and modification",
};

export default async function McpToolsPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return <McpToolsClient isLoggedIn={isLoggedIn} />;
}
