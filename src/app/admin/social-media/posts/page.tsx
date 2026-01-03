"use client";

/**
 * Social Media Posts Management Page
 *
 * Create, schedule, and manage posts across all social media platforms.
 */

import {
  PLATFORM_CONFIG,
  useSocialMediaData,
} from "@/components/admin/social-media/SocialMediaLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  FileText,
  Image as ImageIcon,
  Link2,
  PenSquare,
  Send,
} from "lucide-react";
import { useState } from "react";

export default function SocialMediaPostsPage() {
  const { data } = useSocialMediaData();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postContent, setPostContent] = useState("");

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Post Management</h2>
          <p className="text-sm text-muted-foreground">
            Create and schedule posts across your social media accounts
          </p>
        </div>
      </div>

      {/* Create Post */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenSquare className="h-5 w-5" />
            Create New Post
          </CardTitle>
          <CardDescription>
            Compose a post and publish to multiple platforms at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Platform Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Select Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {data.accounts.map((account) => {
                const config = PLATFORM_CONFIG[account.platform];
                const isSelected = selectedPlatforms.includes(account.platform);
                return (
                  <button
                    key={account.id}
                    onClick={() => togglePlatform(account.platform)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${config.color}`}
                    >
                      {config.icon}
                    </div>
                    <span className="text-sm">{config.name}</span>
                    <Checkbox checked={isSelected} className="ml-1" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Post Content */}
          <div>
            <Label htmlFor="post-content" className="text-sm font-medium mb-2 block">
              Post Content
            </Label>
            <Textarea
              id="post-content"
              placeholder="What would you like to share?"
              className="min-h-[120px]"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled>
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Image
                </Button>
                <Button variant="ghost" size="sm" disabled>
                  <Link2 className="h-4 w-4 mr-1" />
                  Link
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {postContent.length}/280 characters
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" disabled>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
              <Button variant="outline" disabled>
                <FileText className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </div>
            <Button disabled>
              <Send className="h-4 w-4 mr-2" />
              Post Now
            </Button>
          </div>

          <p className="text-sm text-muted-foreground text-center mt-2">
            Post creation requires API integration (coming soon)
          </p>
        </CardContent>
      </Card>

      {/* Scheduled Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Posts
          </CardTitle>
          <CardDescription>
            Upcoming posts in your content calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No Scheduled Posts</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Once you schedule posts, they&apos;ll appear here. Connect your social media APIs to
              enable posting.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
          <CardDescription>
            Your latest posts across all platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No Posts Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Connect your social media APIs to view and manage your posts from this dashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle>Content Management Features</CardTitle>
          <CardDescription>
            Advanced posting capabilities coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Content Calendar
              </h4>
              <p className="text-sm text-muted-foreground">
                Visual calendar view for planning your content schedule
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Best Time to Post
              </h4>
              <p className="text-sm text-muted-foreground">
                AI-powered suggestions for optimal posting times
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Media Library
              </h4>
              <p className="text-sm text-muted-foreground">
                Store and manage images and videos for your posts
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-dashed">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Post Templates
              </h4>
              <p className="text-sm text-muted-foreground">
                Save and reuse post templates for consistent branding
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
