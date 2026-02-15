"use client";

import {
  AgentProgressIndicator,
} from "@/components/my-apps/AgentProgressIndicator";
import { MiniPreview } from "@/components/my-apps/MiniPreview";
import { PreviewModal } from "@/components/my-apps/PreviewModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAppWorkspace } from "@/hooks/useAppWorkspace";
import { formatFileSize } from "@/lib/apps/format";
import { motion } from "framer-motion";
import { FileText, ImagePlus, Paperclip, StopCircle, Trash2, X } from "lucide-react";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

// Markdown components for chat rendering
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="bg-white/10 text-teal-300 px-1.5 py-0.5 rounded text-sm font-mono">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-black/30 border border-white/10 rounded-lg p-3 overflow-x-auto my-2 text-sm">
      {children}
    </pre>
  ),
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-teal-400 hover:text-teal-300 underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-teal-500/50 pl-3 my-2 text-zinc-300 italic">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
};

function MarkdownContent({ content }: { content: string }) {
  return <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>;
}

export default function CodeSpacePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const codeSpace = params["codeSpace"] as string;
  const templateId = searchParams.get("template");

  const workspace = useAppWorkspace(codeSpace, router);

  const {
    mode, app, error,
    messages, clearMessages, clearingChat,
    agentWorking, streamingResponse, isSyncing, syncFlashKey,
    isStreaming, sendingMessage, movingToBin,
    agentStage, currentTool, agentStartTime, agentError,
    previewModalOpen, setPreviewModalOpen, previewModalUrl, previewModalVersion,
    versionMap, totalVersions,
    pendingImages, pendingFiles, setPendingFiles, uploadingImages,
    handleFileSelect, handleImageSelect, handleRemoveFile, handleRemoveImage,
    uploadImages, fileInputRef, imageInputRef,
    handleCreateApp, handleSendMessage, handleMoveToBin,
    handleCancelAgent, handleOpenPreview, refreshIframe,
  } = workspace;

  // Local UI state
  const [newMessage, setNewMessage] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const codespaceUrl = `/api/codespace/${codeSpace}/embed`;

  // Debounced scroll to bottom
  const scrollToBottom = useMemo(() => {
    let timeout: NodeJS.Timeout | null = null;
    return () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse, scrollToBottom]);

  // Track scroll position for floating indicator
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const threshold = 100;
      const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setIsAtBottom(scrollBottom < threshold);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [mode]);

  const onCreateApp = useCallback(async () => {
    if (!newMessage.trim() && pendingFiles.length === 0) return;
    try {
      await handleCreateApp(newMessage, templateId, pendingFiles);
      setNewMessage("");
      setPendingFiles([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create app. Please try again.");
    }
  }, [newMessage, templateId, pendingFiles, handleCreateApp, setPendingFiles]);

  const onSendMessage = useCallback(async () => {
    if ((!newMessage.trim() && pendingImages.length === 0) || sendingMessage || isStreaming) return;
    const content = newMessage.trim();
    setNewMessage("");
    try {
      const imageIds = await uploadImages();
      await handleSendMessage(content, imageIds);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send message");
    }
  }, [newMessage, pendingImages, sendingMessage, isStreaming, uploadImages, handleSendMessage]);

  const onMoveToBin = useCallback(async () => {
    try {
      const appName = await handleMoveToBin();
      if (appName) {
        toast.success(`"${appName}" moved to bin`);
        router.push("/my-apps");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to move to bin");
    }
  }, [handleMoveToBin, router]);

  const onCancelAgent = useCallback(() => {
    handleCancelAgent();
    toast.info("Agent processing cancelled");
  }, [handleCancelAgent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (mode === "prompt") {
        onCreateApp();
      } else {
        onSendMessage();
      }
    }
  };

  // Loading state
  if (mode === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[600px]" />
            <Skeleton className="h-[600px]" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !app) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-24 pb-8">
          <Card className="mx-auto max-w-md">
            <CardHeader>
              <CardTitle>Invalid Codespace</CardTitle>
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardHeader>
            <div className="p-6 pt-0">
              <Link href="/my-apps">
                <Button>Back to My Apps</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
            {mode === "prompt" && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
                New App
              </Badge>
            )}
            {mode === "workspace" && agentWorking && (
              <Badge
                variant="secondary"
                className="bg-teal-500/20 text-teal-200 border-teal-500/30 animate-pulse"
                data-testid="agent-working"
              >
                Agent Working
              </Badge>
            )}
          </div>
          {mode === "workspace" && (
            <div className="flex gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="rounded-full bg-white/5 border-white/10 hover:bg-red-500/20 hover:border-red-500/30 text-zinc-400 hover:text-red-300 transition-all backdrop-blur-sm"
                    variant="outline"
                    disabled={movingToBin}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {movingToBin ? "Moving..." : "Move to Bin"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-zinc-100">
                      Move &ldquo;{app?.name}&rdquo; to bin?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400">
                      This app will be moved to your bin. You can restore it within 30 days before
                      it&apos;s permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onMoveToBin}
                      className="bg-red-600 hover:bg-red-500 text-white"
                    >
                      Move to Bin
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Link href={codespaceUrl} target="_blank">
                <Button
                  className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white hover:text-white transition-all shadow-lg hover:shadow-xl backdrop-blur-sm"
                  variant="outline"
                >
                  Open in New Tab
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <Card className="flex flex-col min-h-[600px] max-h-[calc(100vh-200px)] bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl rounded-3xl overflow-hidden ring-1 ring-white/5">
            <CardHeader className="border-b border-white/5 bg-white/[0.02] px-6 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-zinc-100">
                  {mode === "prompt" ? "What would you like to build?" : "Chat"}
                </CardTitle>
                {mode === "workspace" && messages.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={clearingChat || app?.status === "ARCHIVED"}
                        className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-full px-4 h-8 text-sm"
                      >
                        {clearingChat ? "Clearing..." : "Clear"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-900 border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-zinc-100">Clear chat history?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This will permanently delete all messages. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={clearMessages}
                          className="bg-red-600 hover:bg-red-500 text-white"
                        >
                          Clear Chat
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              {mode === "prompt" && (
                <p className="text-sm text-zinc-400 mt-1">
                  Describe your app idea and attach any relevant files
                </p>
              )}
            </CardHeader>

            <CardContent className="flex-1 min-h-0 overflow-hidden p-0 relative">
              <div
                ref={scrollContainerRef}
                className="absolute inset-0 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
              >
                {mode === "prompt"
                  ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="flex h-full items-center justify-center text-center"
                    >
                      <div className="space-y-6 max-w-md">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500/20 to-purple-500/20 mx-auto flex items-center justify-center border border-white/10 shadow-lg shadow-teal-500/5">
                          <svg className="w-10 h-10 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-2xl font-semibold text-zinc-100">Start with a prompt</h3>
                          <p className="text-zinc-400 leading-relaxed">
                            Describe what you want to build and our AI will create it for you.
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 pt-2">
                          {["PDF", "TXT", "JSON", "CSV", "MD"].map((type) => (
                            <span key={type} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400">
                              .{type.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )
                  : messages.length === 0
                  ? (
                    <div className="flex h-full items-center justify-center text-center text-zinc-500">
                      <div className="space-y-4 max-w-xs">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 mx-auto flex items-center justify-center border border-white/5">
                          <svg className="w-8 h-8 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-zinc-300">No messages yet</p>
                        <p className="text-sm">Start a conversation to begin building your app.</p>
                      </div>
                    </div>
                  )
                  : (
                    <div className="space-y-6">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === "USER" ? "justify-end" : "justify-start"}`}
                          data-testid={message.role === "USER" ? "user-message" : message.role === "AGENT" ? "agent-message" : "system-message"}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
                              message.role === "USER"
                                ? "bg-teal-600/90 text-white backdrop-blur-sm shadow-[0_4px_20px_-4px_rgba(20,184,166,0.3)]"
                                : message.role === "SYSTEM"
                                ? "bg-white/5 text-zinc-400 text-sm border border-white/5"
                                : "bg-white/10 text-zinc-100 backdrop-blur-md border border-white/5"
                            }`}
                          >
                            <div className="leading-relaxed">
                              {message.role === "AGENT"
                                ? <MarkdownContent content={message.content} />
                                : <p className="whitespace-pre-wrap">{message.content}</p>}
                            </div>
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {message.attachments.map((attachment) => (
                                  <Image
                                    key={attachment.image.id}
                                    src={attachment.image.originalUrl}
                                    alt="Attachment"
                                    width={80}
                                    height={80}
                                    className="h-20 w-20 rounded-lg object-cover ring-1 ring-white/10"
                                    unoptimized
                                  />
                                ))}
                              </div>
                            )}
                            {message.role === "AGENT" && message.codeVersion && (() => {
                              const versionNumber = versionMap.get(message.id) ?? 1;
                              const isLatest = versionNumber === totalVersions;
                              const versionedUrl = isLatest
                                ? codespaceUrl
                                : `/api/codespace/${codeSpace}/version/${versionNumber}/embed`;
                              return (
                                <MiniPreview
                                  codespaceUrl={versionedUrl}
                                  versionNumber={versionNumber}
                                  isLatest={isLatest}
                                  onClick={() =>
                                    handleOpenPreview(
                                      versionedUrl,
                                      `Version ${versionNumber}${isLatest ? " (latest)" : ""}`,
                                    )}
                                  isSyncing={isLatest && isSyncing}
                                  syncFlashKey={syncFlashKey}
                                  versionId={message.codeVersion?.id}
                                  appId={app?.id}
                                  onRestore={refreshIframe}
                                />
                              );
                            })()}
                            <p className={`mt-1.5 text-xs ${message.role === "USER" ? "text-teal-100/70" : "text-zinc-500"}`}>
                              {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                {isStreaming && streamingResponse && (
                  <div className="flex justify-start mt-2">
                    <div className="max-w-[85%] rounded-2xl px-5 py-3 bg-white/10 text-zinc-100 backdrop-blur-md border border-white/5">
                      <div className="leading-relaxed">
                        <MarkdownContent content={streamingResponse} />
                        <span className="inline-block w-2 h-4 ml-1 bg-teal-500 animate-pulse rounded-full align-middle" />
                      </div>
                      {isSyncing && (
                        <div className="mt-4">
                          <MiniPreview
                            codespaceUrl={codespaceUrl}
                            isLatest={true}
                            onClick={() => handleOpenPreview(codespaceUrl, "Live Preview (Working...)")}
                            isSyncing={true}
                            syncFlashKey={syncFlashKey}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </CardContent>

            {/* Inline Agent Progress Indicator */}
            {isStreaming && isAtBottom && (
              <div className="mx-4 mb-2">
                <AgentProgressIndicator
                  stage={agentStage}
                  currentTool={currentTool}
                  errorMessage={agentError}
                  isVisible={isStreaming}
                  startTime={agentStartTime}
                  className="shadow-lg"
                />
                <div className="flex justify-center mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancelAgent}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full px-4 h-8 text-sm gap-2"
                  >
                    <StopCircle className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Floating Agent Progress Indicator */}
            {isStreaming && !isAtBottom && (
              <AgentProgressIndicator
                stage={agentStage}
                currentTool={currentTool}
                errorMessage={agentError}
                isVisible={isStreaming}
                startTime={agentStartTime}
                floating={true}
                onScrollToBottom={scrollToBottom}
              />
            )}

            {/* Message Input */}
            <div className="border-t border-white/5 bg-white/[0.02] p-4">
              {mode === "prompt" && pendingFiles.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {pendingFiles.map((pf) => (
                    <div key={pf.id} className="relative group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                      <FileText className="h-5 w-5 text-zinc-400" />
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-300 truncate max-w-[120px]">{pf.file.name}</span>
                        <span className="text-[10px] text-zinc-500">{formatFileSize(pf.file.size)}</span>
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

              {mode === "workspace" && pendingImages.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {pendingImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <Image
                        src={img.previewUrl}
                        alt="Pending upload"
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-lg object-cover ring-1 ring-white/10"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 relative">
                {mode === "prompt"
                  ? (
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.pdf,.doc,.docx,.md,.json,.csv,.xml,.yaml,.yml,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.h,.hpp,.cs,.go,.rb,.php,.swift,.kt,.rs,.sql,.sh,.bash,.zsh"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                  )
                  : (
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                  )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => (mode === "prompt" ? fileInputRef.current?.click() : imageInputRef.current?.click())}
                  disabled={sendingMessage || uploadingImages || (mode === "prompt" ? pendingFiles.length >= 10 : pendingImages.length >= 5)}
                  className="h-10 w-10 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  aria-label={mode === "prompt" ? "Attach files" : "Attach images"}
                >
                  {mode === "prompt" ? <Paperclip className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />}
                </Button>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === "prompt" ? "E.g., A personal finance tracker with charts..." : "Type your message..."}
                  autoComplete="off"
                  className="min-h-[60px] max-h-[200px] resize-none bg-black/20 border-white/10 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 rounded-2xl pl-4 pr-14 py-3 text-zinc-200 placeholder:text-zinc-600 backdrop-blur-sm transition-all"
                  disabled={sendingMessage || (mode === "workspace" && app?.status === "ARCHIVED")}
                  autoFocus={mode === "prompt"}
                  data-testid="chat-input"
                />
                <Button
                  onClick={mode === "prompt" ? onCreateApp : onSendMessage}
                  disabled={
                    (mode === "prompt" ? !newMessage.trim() && pendingFiles.length === 0 : !newMessage.trim() && pendingImages.length === 0) ||
                    sendingMessage ||
                    uploadingImages ||
                    (mode === "workspace" && app?.status === "ARCHIVED")
                  }
                  aria-label={mode === "prompt" ? "Start building" : "Send message"}
                  className={`absolute right-2 bottom-2 h-10 ${
                    mode === "prompt" ? "px-4" : "w-10 p-0"
                  } rounded-xl transition-all duration-300 ${
                    (mode === "prompt" ? !newMessage.trim() && pendingFiles.length === 0 : !newMessage.trim() && pendingImages.length === 0) ||
                    sendingMessage ||
                    uploadingImages
                      ? "bg-white/5 text-zinc-500"
                      : "bg-teal-500 hover:bg-teal-400 text-white shadow-[0_0_20px_-5px_rgba(20,184,166,0.6)]"
                  }`}
                >
                  {sendingMessage || uploadingImages
                    ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : mode === "prompt"
                    ? <span className="font-medium">Start</span>
                    : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                      </svg>
                    )}
                </Button>
              </div>
              <div className="mt-2 text-center">
                <p className="text-[10px] text-zinc-600">
                  Press{" "}
                  <kbd className="font-sans px-1 py-0.5 bg-white/5 rounded border border-white/10 text-zinc-500">Enter</kbd>{" "}
                  to {mode === "prompt" ? "start" : "send"} • Click{" "}
                  {mode === "prompt" ? <Paperclip className="inline h-3 w-3" /> : <ImagePlus className="inline h-3 w-3" />}{" "}
                  to attach {mode === "prompt" ? "files" : "images"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <PreviewModal
          open={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          codespaceUrl={previewModalUrl || codespaceUrl}
          versionLabel={previewModalVersion}
        />
      </div>
    </div>
  );
}
