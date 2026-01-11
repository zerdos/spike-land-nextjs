"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { Textarea } from "@/components/ui/textarea";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function TempAppWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const tempId = params?.tempId as string;

  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Send message - acts as CREATE trigger
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;

    const content = newMessage.trim();
    setSendingMessage(true);

    try {
      const response = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: content,
          codespaceId: tempId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create app");
      }

      const app = await response.json();

      // Redirect to the real app page
      router.push(`/my-apps/${app.id}`);
    } catch (e) {
      console.error("Failed to create app", e);
      toast.error("Failed to create app. Please try again.");
      setSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const codespaceUrl = `https://testing.spike.land/live/${tempId}/`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-24 pb-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/my-apps"
              className="text-muted-foreground hover:text-foreground"
            >
              &larr; Back
            </Link>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              New App (Draft)
            </h1>
            <Badge variant="outline">
              Draft
            </Badge>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chat Panel */}
          <Card className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Chat</CardTitle>
                  <CardDescription>
                    Describe your app to start building
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              {/* Empty State / Messages Area */}
              <div className="h-full overflow-y-auto p-4 flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <h3 className="text-lg font-medium mb-2">What would you like to build?</h3>
                  <p className="max-w-sm mx-auto">
                    Sending a message will save this app to your workspace and start the AI agent.
                  </p>
                </div>
              </div>
            </CardContent>
            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="E.g., A personal finance tracker with charts..."
                  className="min-h-[60px] resize-none"
                  disabled={sendingMessage}
                  autoFocus
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="shrink-0"
                >
                  {sendingMessage ? "Creating..." : "Start"}
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            {/* Preview Panel */}
            <Card className="flex flex-col h-[500px] overflow-hidden bg-zinc-950 border-zinc-800">
              {/* Browser Toolbar */}
              <div className="flex items-center gap-4 border-b border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/20 hover:bg-red-500 transition-colors" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/20 hover:bg-yellow-500 transition-colors" />
                  <div className="h-3 w-3 rounded-full bg-green-500/20 hover:bg-green-500 transition-colors" />
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <div className="flex w-full max-w-sm items-center gap-2 rounded-md bg-zinc-950/50 px-3 py-1.5 text-xs text-zinc-500">
                    <div className="h-2 w-2 rounded-full bg-zinc-700" />
                    <span>
                      {codespaceUrl.replace("https://", "")}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
                  onClick={() => setIframeKey((prev) => prev + 1)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
                    <path d="M3 3v9h9" />
                  </svg>
                </Button>
              </div>

              <CardContent className="flex-1 overflow-hidden p-0 md:p-0 relative bg-zinc-950">
                <iframe
                  key={iframeKey}
                  src={codespaceUrl}
                  className="border-0"
                  style={{
                    display: "block",
                    width: "200.5%",
                    height: "200.5%",
                    transform: "scale(0.5)",
                    transformOrigin: "0 0",
                  }}
                  title="App Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </CardContent>
            </Card>

            {/* Console Placeholder */}
            <Card className="flex flex-col h-[200px] bg-[#0d0d0d] border-zinc-800 font-mono text-xs opacity-50">
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
                <div className="flex items-center gap-2 text-zinc-500">
                  <span>Terminal</span>
                </div>
              </div>
              <CardContent className="flex-1 p-4 text-zinc-600">
                <p>Terminal will become active after app creation...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
