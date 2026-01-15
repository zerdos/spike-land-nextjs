"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { FileText, Paperclip, X } from "lucide-react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface PendingFile {
  id: string;
  file: File;
  previewUrl?: string;
}

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Helper to get file icon based on extension
function getFileIcon(_filename: string): React.ReactNode {
  return <FileText className="h-5 w-5 text-zinc-400" />;
}

export default function TempAppWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const tempId = params?.["tempId"] as string;

  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection - accept all file types except images
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: PendingFile[] = [];
    for (let i = 0; i < Math.min(files.length, 10); i++) {
      const file = files[i];
      // Skip image files
      if (file && !file.type.startsWith("image/")) {
        newFiles.push({
          id: `pending-${Date.now()}-${i}`,
          file,
        });
      }
    }
    setPendingFiles((prev) => [...prev, ...newFiles].slice(0, 10));
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove pending file
  const handleRemoveFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Send message - acts as CREATE trigger
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && pendingFiles.length === 0) || sendingMessage) return;

    const content = newMessage.trim();
    setSendingMessage(true);

    try {
      // Create FormData to include files
      const formData = new FormData();
      formData.append("prompt", content || "[Files attached]");
      formData.append("codespaceId", tempId);

      // Add files if any
      pendingFiles.forEach((pf) => {
        formData.append("files", pf.file);
      });

      const response = await fetch("/api/apps", {
        method: "POST",
        body: pendingFiles.length > 0 ? formData : JSON.stringify({
          prompt: content,
          codespaceId: tempId,
        }),
        headers: pendingFiles.length > 0 ? undefined : { "Content-Type": "application/json" },
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
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 overflow-x-hidden relative selection:bg-teal-500/30">
      {/* Ambient Glow Effects */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 -left-64 w-96 h-96 bg-teal-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-64 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-teal-500/5 to-transparent blur-3xl opacity-50" />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-8 relative z-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/my-apps"
              className="group flex items-center gap-2 text-zinc-400 hover:text-white transition-colors duration-200"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                &larr;
              </div>
              <span className="font-medium">Back</span>
            </Link>
            <Badge
              variant="secondary"
              className="bg-amber-500/20 text-amber-200 border-amber-500/30"
            >
              New App
            </Badge>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-2 lg:h-[calc(100vh-200px)] min-h-[600px]">
          {/* Chat Panel */}
          <Card className="flex flex-col h-full bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl rounded-3xl overflow-hidden ring-1 ring-white/5">
            <div className="border-b border-white/5 bg-white/[0.02] px-6 py-4">
              <h2 className="text-xl font-semibold text-zinc-100">What would you like to build?</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Describe your app idea and attach any relevant files
              </p>
            </div>
            <CardContent className="flex-1 overflow-hidden p-0 relative">
              {/* Welcome State */}
              <div className="h-full overflow-y-auto p-6 flex items-center justify-center text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6 max-w-md"
                >
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500/20 to-purple-500/20 mx-auto flex items-center justify-center border border-white/10 shadow-lg shadow-teal-500/5">
                    <svg
                      className="w-10 h-10 text-teal-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-zinc-100">
                      Start with a prompt
                    </h3>
                    <p className="text-zinc-400 leading-relaxed">
                      Describe what you want to build and our AI will create it for you. You can
                      also attach files like PDFs, documents, or code files to help guide the
                      process.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {["PDF", "TXT", "JSON", "CSV", "MD"].map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400"
                      >
                        .{type.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </div>
            </CardContent>
            {/* Message Input */}
            <div className="border-t border-white/5 bg-white/[0.02] p-4">
              {/* Pending Files Preview */}
              {pendingFiles.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {pendingFiles.map((pf) => (
                    <div
                      key={pf.id}
                      className="relative group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                    >
                      {getFileIcon(pf.file.name)}
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-300 truncate max-w-[120px]">
                          {pf.file.name}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {formatFileSize(pf.file.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(pf.id)}
                        className="ml-1 h-5 w-5 rounded-full bg-white/10 text-zinc-400 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                        aria-label="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3 relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.doc,.docx,.md,.json,.csv,.xml,.yaml,.yml,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.h,.hpp,.cs,.go,.rb,.php,.swift,.kt,.rs,.sql,.sh,.bash,.zsh"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sendingMessage || pendingFiles.length >= 10}
                  className="h-10 w-10 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  aria-label="Attach files"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="E.g., A personal finance tracker with charts..."
                  autoComplete="off"
                  className="min-h-[60px] max-h-[200px] resize-none bg-black/20 border-white/10 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 rounded-2xl pl-4 pr-14 py-3 text-zinc-200 placeholder:text-zinc-600 backdrop-blur-sm transition-all"
                  disabled={sendingMessage}
                  autoFocus
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={(!newMessage.trim() && pendingFiles.length === 0) || sendingMessage}
                  aria-label="Start building"
                  className={`absolute right-2 bottom-2 h-10 px-4 rounded-xl transition-all duration-300 ${
                    (!newMessage.trim() && pendingFiles.length === 0) || sendingMessage
                      ? "bg-white/5 text-zinc-500"
                      : "bg-teal-500 hover:bg-teal-400 text-white shadow-[0_0_20px_-5px_rgba(20,184,166,0.6)]"
                  }`}
                >
                  {sendingMessage
                    ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )
                    : <span className="font-medium">Start</span>}
                </Button>
              </div>
              <div className="mt-2 text-center">
                <p className="text-[10px] text-zinc-600">
                  Press{" "}
                  <kbd className="font-sans px-1 py-0.5 bg-white/5 rounded border border-white/10 text-zinc-500">
                    Enter
                  </kbd>{" "}
                  to start • Click <Paperclip className="inline h-3 w-3" /> to attach files
                </p>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3 h-full">
            {/* Preview Panel */}
            <motion.div layoutId={`app-card-${tempId}`} className="flex-1 h-full min-h-[500px]">
              <Card className="flex flex-col h-full overflow-hidden bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl rounded-3xl ring-1 ring-white/5 relative group">
                {/* Glow effect for preview card */}
                <div className="absolute -inset-[1px] bg-gradient-to-br from-white/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Browser Toolbar */}
                <div className="flex items-center gap-4 border-b border-white/5 bg-white/[0.02] px-5 py-4 relative z-10 overflow-hidden">
                  <div className="flex gap-2 shrink-0">
                    <div className="h-3 w-3 rounded-full bg-[#FF5F56] border border-white/5 shadow-inner" />
                    <div className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-white/5 shadow-inner" />
                    <div className="h-3 w-3 rounded-full bg-[#27C93F] border border-white/5 shadow-inner" />
                  </div>

                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="bg-black/20 rounded-lg border border-white/5 py-1.5 px-3 flex items-center overflow-hidden">
                      <div
                        data-testid="address-bar"
                        className="text-[11px] text-zinc-400 truncate font-mono w-full"
                        style={{ direction: "rtl", textAlign: "left" }}
                      >
                        {codespaceUrl}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0"
                    onClick={() => setIframeKey((prev) => prev + 1)}
                    title="Refresh Preview"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
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

                <CardContent className="flex-1 overflow-hidden p-0 md:p-0 relative bg-zinc-950/50 z-10 rounded-b-3xl">
                  <iframe
                    key={iframeKey}
                    src={codespaceUrl}
                    className="border-0 w-full h-full rounded-b-3xl"
                    style={{
                      width: "200%",
                      height: "200%",
                      transform: "scale(0.5)",
                      transformOrigin: "0 0",
                    }}
                    title="App Preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
