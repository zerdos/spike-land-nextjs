import type { SocialPlatform } from "@prisma/client";
import { Facebook, Instagram, Linkedin, MessageCircle, Twitter, Youtube } from "lucide-react";

interface ConnectionPlatformIconsProps {
  platforms: { platform: SocialPlatform; handle: string; profileUrl?: string | null; }[];
  className?: string;
}

const PLATFORM_ICONS: Record<SocialPlatform, React.ComponentType<{ className?: string; }>> = {
  TWITTER: Twitter,
  LINKEDIN: Linkedin,
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  YOUTUBE: Youtube,
  TIKTOK: MessageCircle, // Using generic icon for TikTok as Lucide might not have it or it's named differently
  DISCORD: MessageCircle,
  PINTEREST: () => <span className="text-lg">📌</span>,
};

export function ConnectionPlatformIcons({ platforms, className }: ConnectionPlatformIconsProps) {
  if (!platforms?.length) return null;

  return (
    <div className={`flex gap-2 ${className}`}>
      {platforms.map((p) => {
        const Icon = PLATFORM_ICONS[p.platform] || MessageCircle;

        if (p.profileUrl) {
          return (
            <a
              key={p.platform}
              href={p.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={`${p.platform}: ${p.handle}`}
            >
              <Icon className="h-4 w-4" />
            </a>
          );
        }

        return (
          <span
            key={p.platform}
            className="text-muted-foreground"
            title={`${p.platform}: ${p.handle}`}
          >
            <Icon className="h-4 w-4" />
          </span>
        );
      })}
    </div>
  );
}
