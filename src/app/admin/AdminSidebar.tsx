"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/analytics", label: "User Analytics", icon: "📈" },
  { href: "/admin/tokens", label: "Token Economics", icon: "💰" },
  { href: "/admin/system", label: "System Health", icon: "🏥" },
  { href: "/admin/jobs", label: "Jobs", icon: "⚙️" },
  { href: "/admin/agents", label: "Agents", icon: "🤖" },
  { href: "/admin/vouchers", label: "Vouchers", icon: "🎟️" },
  { href: "/admin/users", label: "User Management", icon: "👥" },
  { href: "/admin/photos", label: "Photos", icon: "📸" },
  { href: "/admin/gallery", label: "Featured Gallery", icon: "🖼️" },
  { href: "/admin/feedback", label: "Feedback", icon: "💬" },
  { href: "/admin/errors", label: "Error Logs", icon: "🐛" },
  { href: "/admin/marketing", label: "Marketing", icon: "📣" },
  { href: "/admin/marketing/ab-tests", label: "A/B Tests", icon: "🧪" },
  { href: "/admin/social-media", label: "Social Media", icon: "📱" },
  { href: "/admin/emails", label: "Email Logs", icon: "📧" },
  { href: "/admin/sitemap", label: "Sitemap Preview", icon: "🗺️" },
  { href: "/admin/merch", label: "Merch", icon: "🛍️" },
];

interface AdminSidebarProps {
  userEmail?: string | null;
  userName?: string | null;
}

export function AdminSidebar({ userEmail, userName }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavContent = () => (
    <div className="flex h-full flex-col gap-4">
      <div className="flex h-[60px] items-center px-6 border-b border-border/40">
        <div className="flex flex-col">
          <span className="font-semibold tracking-tight">Admin Dashboard</span>
          <span className="text-xs text-muted-foreground truncate max-w-[180px]">
            {userName || userEmail}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        <nav className="flex flex-col gap-1 pb-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-border/40 p-4">
        <Link
          href="/"
          data-testid="back-to-app-link"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <span>←</span>
          <span>Back to App</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Trigger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-4 top-4 z-40 lg:hidden"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Admin Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border/40 bg-card lg:block">
        <NavContent />
      </aside>
    </>
  );
}
