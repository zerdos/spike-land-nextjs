"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

// Social media platforms configuration
const socialPlatforms = [
  {
    name: "X (Twitter)",
    handle: "@ai_spike_land",
    url: "https://x.com/ai_spike_land",
    icon: "𝕏",
    description: "Updates, announcements, and community discussions",
    color: "bg-black dark:bg-white dark:text-black",
    followers: null, // Will be populated from API later
  },
  {
    name: "LinkedIn",
    handle: "spike.land",
    url: "https://linkedin.com/company/spike-land",
    icon: "in",
    description: "Professional updates and company news",
    color: "bg-[#0A66C2] text-white",
    followers: null,
  },
  {
    name: "Facebook",
    handle: "spike.land",
    url: "https://facebook.com/spikeland",
    icon: "f",
    description: "Community posts and feature announcements",
    color: "bg-[#1877F2] text-white",
    followers: null,
  },
  {
    name: "Instagram",
    handle: "@spike_land",
    url: "https://instagram.com/spike_land",
    icon: "📷",
    description: "Visual showcases of enhanced images",
    color: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white",
    followers: null,
  },
  {
    name: "YouTube",
    handle: "spike.land",
    url: "https://youtube.com/@spike_land",
    icon: "▶",
    description: "Tutorials, demos, and feature walkthroughs",
    color: "bg-[#FF0000] text-white",
    followers: null,
  },
  {
    name: "TikTok",
    handle: "@spike_land",
    url: "https://tiktok.com/@spike_land",
    icon: "♪",
    description: "Short-form content and creative showcases",
    color: "bg-black text-white",
    followers: null,
  },
  {
    name: "Discord",
    handle: "spike.land",
    url: "https://discord.gg/spikeland",
    icon: "💬",
    description: "Community chat, support, and discussions",
    color: "bg-[#5865F2] text-white",
    followers: null,
  },
  {
    name: "Reddit",
    handle: "u/spike_land",
    url: "https://reddit.com/user/spike_land",
    icon: "🔴",
    description: "Community discussions and feature requests",
    color: "bg-[#FF4500] text-white",
    followers: null,
  },
  {
    name: "Dev.to",
    handle: "@spike_land",
    url: "https://dev.to/spike_land",
    icon: "DEV",
    description: "Technical articles and developer resources",
    color: "bg-black text-white",
    followers: null,
  },
  {
    name: "Hacker News",
    handle: "spike_land",
    url: "https://news.ycombinator.com/user?id=spike_land",
    icon: "Y",
    description: "Tech community discussions",
    color: "bg-[#FF6600] text-white",
    followers: null,
  },
  {
    name: "GitHub",
    handle: "zerdos",
    url: "https://github.com/zerdos",
    icon: "🐙",
    description: "Open source projects and contributions",
    color: "bg-[#24292e] text-white",
    followers: null,
  },
];

export default function SocialPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto pt-24 pb-12 px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Connect With Us</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Follow spike.land on your favorite platforms for updates, tutorials, community
            discussions, and more.
          </p>
        </div>

        {/* Main Social Platforms */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Main Platforms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {socialPlatforms.slice(0, 6).map((platform) => (
              <Card key={platform.name} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${platform.color}`}
                  >
                    {platform.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                    <CardDescription>{platform.handle}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    {platform.description}
                  </p>
                  <Button asChild className="w-full">
                    <a href={platform.url} target="_blank" rel="noopener noreferrer">
                      Follow <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Developer Platforms */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Developer Community</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {socialPlatforms.slice(6).map((platform) => (
              <Card key={platform.name} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${platform.color}`}
                  >
                    {platform.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                    <CardDescription>{platform.handle}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    {platform.description}
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <a href={platform.url} target="_blank" rel="noopener noreferrer">
                      Follow <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Newsletter Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Stay Updated</CardTitle>
            <CardDescription>
              Get the latest news, feature updates, and tips delivered to your inbox.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <p className="text-muted-foreground">
                Coming soon: Subscribe to our newsletter for exclusive updates and early access to
                new features.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Direct Contact</CardTitle>
            <CardDescription>
              Have questions? Reach out to us directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="font-semibold">Email:</span>
              <a href="mailto:hello@spike.land" className="text-primary hover:underline">
                hello@spike.land
              </a>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold">Website:</span>
              <a href="https://spike.land" className="text-primary hover:underline">
                spike.land
              </a>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold">Company:</span>
              <span className="text-muted-foreground">
                SPIKE LAND LTD (UK Company #16906682)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
