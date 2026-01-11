"use client";

import { UserAvatar } from "@/components/auth/user-avatar";
import { WorkspaceSwitcher } from "@/components/orbit/WorkspaceSwitcher";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const getNavItems = (workspaceSlug: string) => [
  { href: `/orbit/${workspaceSlug}/dashboard`, label: "Dashboard", icon: "📊" },
  { href: `/orbit/${workspaceSlug}/streams`, label: "Streams", icon: "📡" },
  { href: `/orbit/${workspaceSlug}/inbox`, label: "Inbox", icon: "📥" },
  { href: `/orbit/${workspaceSlug}/calendar`, label: "Calendar", icon: "📅" },
  { href: `/orbit/${workspaceSlug}/allocator`, label: "Allocator", icon: "💰" },
  {
    href: `/orbit/${workspaceSlug}/content-library`,
    label: "Content Library",
    icon: "📚",
  },
  {
    href: `/orbit/${workspaceSlug}/brand-brain`,
    label: "Brand Brain",
    icon: "🧠",
  },
  { href: `/orbit/${workspaceSlug}/ai-agents`, label: "AI Agents", icon: "🤖" },
  {
    href: `/orbit/${workspaceSlug}/workflows`,
    label: "Workflows",
    icon: "⚡️",
  },
  { href: `/orbit/${workspaceSlug}/settings`, label: "Settings", icon: "⚙️" },
];

interface OrbitSidebarProps {
  userEmail?: string | null;
  userName?: string | null;
  workspaceSlug: string;
}

export function OrbitSidebar({
  userEmail,
  userName,
  workspaceSlug,
}: OrbitSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navItems = getNavItems(workspaceSlug);

  const NavContent = () => (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b px-3 py-3">
        <WorkspaceSwitcher />
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <UserAvatar user={{ name: userName, email: userEmail }} />
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">{userName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {userEmail}
            </span>
          </div>
        </div>
        <div className="mt-4">
          <Link
            href="/"
            className="block w-full rounded-md border p-2 text-center text-sm font-medium hover:bg-muted"
          >
            Back to App
          </Link>
        </div>
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
            <span className="sr-only">Toggle Orbit Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-background lg:flex">
        <NavContent />
      </div>
    </>
  );
}
