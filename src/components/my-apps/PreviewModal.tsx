"use client";

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  codespaceUrl: string;
  versionLabel?: string;
}

/**
 * Full-size modal viewer for app previews.
 * Features browser chrome, refresh, open in new tab, and Escape to close.
 */
export function PreviewModal({
  open,
  onClose,
  codespaceUrl,
  versionLabel,
}: PreviewModalProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    window.open(codespaceUrl, "_blank", "noopener,noreferrer");
  }, [codespaceUrl]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="App preview"
        >
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-[90vw] h-[90vh] bg-zinc-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Browser chrome header */}
            <div className="flex items-center gap-4 border-b border-white/10 bg-zinc-900 px-4 py-3 shrink-0">
              {/* Traffic lights */}
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="h-3 w-3 rounded-full bg-[#FF5F56] hover:bg-[#FF3D3D] transition-colors"
                  aria-label="Close"
                />
                <div className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
                <div className="h-3 w-3 rounded-full bg-[#27C93F]" />
              </div>

              {/* URL bar */}
              <div className="flex-1 min-w-0">
                <div className="bg-black/30 rounded-lg border border-white/5 py-1.5 px-3 flex items-center">
                  <span
                    className="text-xs text-zinc-400 truncate font-mono"
                    style={{ direction: "rtl", textAlign: "left" }}
                  >
                    {codespaceUrl}
                  </span>
                </div>
              </div>

              {/* Version label */}
              {versionLabel && (
                <span className="text-xs text-teal-400 font-medium shrink-0">
                  {versionLabel}
                </span>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                  aria-label="Refresh preview"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenInNewTab}
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                  aria-label="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Iframe container */}
            <div className="flex-1 relative bg-white">
              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-zinc-400">Loading preview...</span>
                  </div>
                </div>
              )}
              {/* Full-size iframe */}
              <iframe
                key={iframeKey}
                src={codespaceUrl}
                className="w-full h-full border-0"
                title="App Preview - Full Size"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onLoad={() => setIsLoading(false)}
              />
            </div>

            {/* Footer hint */}
            <div className="border-t border-white/10 bg-zinc-900/50 px-4 py-2 text-center shrink-0">
              <span className="text-xs text-zinc-500">
                Press{" "}
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-zinc-400 font-mono">
                  Esc
                </kbd>{" "}
                or click backdrop to close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
