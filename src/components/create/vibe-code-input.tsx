"use client";

import { Button } from "@/components/ui/button";
import { Camera, ImagePlus, Send, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useVibeCode } from "./vibe-code-provider";

interface ImagePreview {
  id: string;
  file: File;
  url: string;
}

export function VibeCodeInput() {
  const { sendMessage, isStreaming, mode } = useVibeCode();
  const [text, setText] = useState("");
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 20;
    const maxHeight = lineHeight * 6;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    const files = images.map((img) => img.file);
    sendMessage(trimmed, files.length > 0 ? files : undefined, includeScreenshot);
    setText("");
    setImages([]);
    setIncludeScreenshot(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, images, includeScreenshot, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const newImages: ImagePreview[] = Array.from(files).map((file) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        url: URL.createObjectURL(file),
      }));
      setImages((prev) => [...prev, ...newImages]);
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [],
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.url);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  return (
    <div className="border-t p-3">
      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt="Attachment"
                className="w-12 h-12 rounded object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute -top-1 -right-1 p-0.5 rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Options row */}
      <div className="flex items-center gap-2 mb-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          data-testid="file-input"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach image"
        >
          <ImagePlus className="w-4 h-4" />
        </Button>
        <button
          type="button"
          onClick={() => setIncludeScreenshot((v) => !v)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
            includeScreenshot
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Include screenshot"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Screenshot</span>
        </button>
      </div>

      {/* Textarea + Send */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={mode === "plan" ? "Ask about the code..." : "Describe changes..."}
          rows={1}
          className="flex-1 resize-none bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          style={{ minHeight: "36px" }}
        />
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSubmit}
          disabled={!text.trim() || isStreaming}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
