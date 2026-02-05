import { cn } from "@/lib/utils";
import Link from "next/link";

interface RelatedAppsProps {
  links: string[];
  className?: string;
}

export function RelatedApps({ links, className }: RelatedAppsProps) {
  if (!links || links.length === 0) return null;

  return (
    <div
      className={cn(
        "w-64 border-l bg-card h-[calc(100vh-4rem)] overflow-y-auto hidden lg:block",
        className,
      )}
    >
      <div className="p-4">
        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
          Related Apps
        </h3>
        <nav className="space-y-2">
          {links.map((link, i) => {
            // Ensure link does not have /create prefix in data if purely slug
            // But our generator might return 'cooking/pizza'.
            // Link href should be /create/{link}

            // Handle if AI returns absolute path or relative (with or without leading slash)
            const cleanLink = link.replace(/^(\/)?create\//, "");
            const href = `/create/${cleanLink}`;

            return (
              <Link
                key={i}
                href={href}
                className="block p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border text-sm"
              >
                <div className="font-medium truncate">
                  {cleanLink.split("/").pop()?.replace(/-/g, " ")}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5 opacity-70">
                  /{cleanLink}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 mt-8 border-t">
        <p className="text-xs text-muted-foreground">
          Try typing any path in the URL to generate a new app!
        </p>
      </div>
    </div>
  );
}
