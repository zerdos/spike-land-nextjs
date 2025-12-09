"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, Copy, Share2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface ShareButtonProps {
  imageId: string;
  shareToken?: string | null;
  imageName: string;
  className?: string;
}

interface ShareResponse {
  shareToken: string;
  shareUrl: string;
}

export function ShareButton({
  imageId,
  shareToken: initialShareToken,
  imageName,
  className,
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const generateShareUrl = useCallback(async () => {
    if (initialShareToken) {
      return `https://spike.land/share/${initialShareToken}`;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/images/${imageId}/share`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate share link");
      }

      const data: ShareResponse = await response.json();
      return data.shareUrl;
    } catch (error) {
      console.error("Failed to generate share link:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate share link",
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [imageId, initialShareToken]);

  const handleOpenChange = useCallback(
    async (open: boolean) => {
      setIsOpen(open);
      if (open && !shareUrl) {
        const url = await generateShareUrl();
        setShareUrl(url);
      }
    },
    [shareUrl, generateShareUrl],
  );

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error("Failed to copy link");
    }
  }, [shareUrl]);

  const getTwitterShareUrl = useCallback(() => {
    if (!shareUrl) return "#";
    const text = `Check out my enhanced image: ${imageName}`;
    return `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${
      encodeURIComponent(text)
    }`;
  }, [shareUrl, imageName]);

  const getFacebookShareUrl = useCallback(() => {
    if (!shareUrl) return "#";
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  }, [shareUrl]);

  const getWhatsAppShareUrl = useCallback(() => {
    if (!shareUrl) return "#";
    const text = `Check out my enhanced image: ${imageName}`;
    return `https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`;
  }, [shareUrl, imageName]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn(className)}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Image</DialogTitle>
          <DialogDescription>
            Share your enhanced image with friends and family.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          {isLoading
            ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Generating share link...
                </span>
              </div>
            )
            : shareUrl
            ? (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="flex-1"
                    aria-label="Share URL"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    aria-label="Copy link"
                  >
                    {isCopied
                      ? <Check className="h-4 w-4 text-green-500" />
                      : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Share on social media
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      asChild
                    >
                      <a
                        href={getTwitterShareUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Share on Twitter"
                      >
                        <svg
                          className="mr-2 h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Twitter
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      asChild
                    >
                      <a
                        href={getFacebookShareUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Share on Facebook"
                      >
                        <svg
                          className="mr-2 h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        Facebook
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      asChild
                    >
                      <a
                        href={getWhatsAppShareUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Share on WhatsApp"
                      >
                        <svg
                          className="mr-2 h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        WhatsApp
                      </a>
                    </Button>
                  </div>
                </div>
              </>
            )
            : (
              <div className="text-center text-sm text-muted-foreground">
                Failed to generate share link. Please try again.
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
