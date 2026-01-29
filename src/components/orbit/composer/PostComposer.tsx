/**
 * PostComposer Component
 *
 * Main post composition interface with integrated AI image generation.
 * Supports multi-platform posting with character limits.
 *
 * Resolves #843
 */

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SocialPlatform } from "@prisma/client";
import { ImagePlus, Loader2, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useBrandProfile } from "@/hooks/useBrandProfile";
import { cn } from "@/lib/utils";

import { ImageEnhancementDialog } from "./ImageEnhancementDialog";
import { ImageGenerationDialog } from "./ImageGenerationDialog";

export interface PostData {
  content: string;
  platforms: SocialPlatform[];
  images: string[];
}

export interface ScheduledPostData extends PostData {
  scheduledAt: Date;
}

export interface PostComposerProps {
  workspaceSlug: string;
  onPublish?: (data: PostData) => Promise<void>;
  onSchedule?: (data: ScheduledPostData) => Promise<void>;
  className?: string;
}

// Platform character limits
const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  TWITTER: 280,
  LINKEDIN: 3000,
  FACEBOOK: 63206,
  INSTAGRAM: 2200,
  TIKTOK: 2200,
  YOUTUBE: 5000,
  DISCORD: 2000,
};

// Platform display names
const PLATFORM_NAMES: Record<SocialPlatform, string> = {
  TWITTER: "Twitter/X",
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  DISCORD: "Discord",
};

const postFormSchema = z.object({
  content: z.string().min(1, "Post content is required"),
  platforms: z.array(z.nativeEnum(SocialPlatform)).min(1, "Select at least one platform"),
  images: z.array(z.string()).max(10, "Maximum 10 images allowed"),
});

type PostFormData = z.infer<typeof postFormSchema>;

export function PostComposer({
  workspaceSlug,
  onPublish,
  onSchedule,
  className,
}: PostComposerProps) {
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [enhanceDialogOpen, setEnhanceDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: brandProfile } = useBrandProfile(workspaceSlug);

  const form = useForm<PostFormData>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      content: "",
      platforms: [],
      images: [],
    },
  });

  const watchedPlatforms = form.watch("platforms");
  const watchedContent = form.watch("content");
  const watchedImages = form.watch("images");

  // Calculate character limit based on selected platforms (use most restrictive)
  const currentLimit =
    watchedPlatforms.length > 0
      ? Math.min(...watchedPlatforms.map((p) => PLATFORM_LIMITS[p]))
      : 280; // Default to Twitter limit

  const contentLength = watchedContent.length;
  const isOverLimit = contentLength > currentLimit;

  const handleImageGenerated = (jobId: string, imageUrl?: string) => {
    if (imageUrl) {
      const currentImages = form.getValues("images");
      form.setValue("images", [...currentImages, imageUrl], { shouldValidate: true });
    }
    setGenerateDialogOpen(false);
  };

  const handleImageEnhanced = (jobId: string, imageUrl?: string) => {
    if (imageUrl) {
      const currentImages = form.getValues("images");
      form.setValue("images", [...currentImages, imageUrl], { shouldValidate: true });
    }
    setEnhanceDialogOpen(false);
  };

  const handleRemoveImage = (index: number) => {
    const currentImages = form.getValues("images");
    form.setValue(
      "images",
      currentImages.filter((_, i) => i !== index),
      { shouldValidate: true },
    );
  };

  const handlePublish = async (data: PostFormData) => {
    if (!onPublish) return;

    setIsSubmitting(true);
    try {
      await onPublish({
        content: data.content,
        platforms: data.platforms,
        images: data.images,
      });
      form.reset();
    } catch (error) {
      console.error("Failed to publish post:", error);
      // Error handling would be done by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const platformsOptions: SocialPlatform[] = [
    "TWITTER",
    "LINKEDIN",
    "FACEBOOK",
    "INSTAGRAM",
  ];

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Post
          </CardTitle>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handlePublish)}>
            <CardContent className="space-y-6">
              {/* Post Content */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What's on your mind?"
                        className="min-h-[120px] resize-none"
                        {...field}
                        data-testid="post-content-textarea"
                      />
                    </FormControl>
                    <FormDescription className="flex justify-between">
                      <span>
                        {watchedPlatforms.length > 0
                          ? `${PLATFORM_NAMES[watchedPlatforms[0]]} ${
                              watchedPlatforms.length > 1
                                ? `(+${watchedPlatforms.length - 1} more)`
                                : ""
                            }`
                          : "Select platforms to see character limits"}
                      </span>
                      <span
                        className={cn(
                          isOverLimit && "text-destructive font-semibold",
                        )}
                        data-testid="character-count"
                      >
                        {contentLength} / {currentLimit}
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Platform Selection */}
              <FormField
                control={form.control}
                name="platforms"
                render={() => (
                  <FormItem>
                    <FormLabel>Select Platforms</FormLabel>
                    <FormDescription>
                      Choose which platforms to publish to
                    </FormDescription>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {platformsOptions.map((platform) => (
                        <FormField
                          key={platform}
                          control={form.control}
                          name="platforms"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={platform}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(platform)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, platform])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== platform,
                                            ),
                                          );
                                    }}
                                    data-testid={`platform-${platform.toLowerCase()}`}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {PLATFORM_NAMES[platform]}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image Attachments */}
              <div className="space-y-3">
                <FormLabel>Images</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {watchedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                      {watchedImages.map((url, index) => (
                        <div
                          key={index}
                          className="relative group aspect-square rounded-lg overflow-hidden border border-border"
                        >
                          <img
                            src={url}
                            alt={`Attachment ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`remove-image-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setGenerateDialogOpen(true)}
                    data-testid="generate-image-button"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEnhanceDialogOpen(true)}
                    disabled={watchedImages.length === 0}
                    data-testid="enhance-image-button"
                  >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Enhance Image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled
                    data-testid="upload-image-button"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload (Coming Soon)
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isSubmitting}
                data-testid="clear-button"
              >
                Clear
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmitting || !onSchedule}
                  data-testid="schedule-button"
                >
                  Schedule
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !onPublish || isOverLimit}
                  data-testid="publish-button"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Publish
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {/* Image Generation Dialog */}
      <ImageGenerationDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        workspaceId={workspaceSlug}
        brandProfile={brandProfile ?? null}
        onImageGenerated={handleImageGenerated}
      />

      {/* Image Enhancement Dialog */}
      <ImageEnhancementDialog
        open={enhanceDialogOpen}
        onOpenChange={setEnhanceDialogOpen}
        workspaceId={workspaceSlug}
        brandProfile={brandProfile ?? null}
        initialImage={watchedImages[0]}
        onImageEnhanced={handleImageEnhanced}
      />
    </>
  );
}
