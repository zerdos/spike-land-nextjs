"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/auth/user-avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/orbit/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/orbit/streams", label: "Streams", icon: "📡" },
  { href: "/orbit/inbox", label: "Inbox", icon: "📥" },
  { href: "/orbit/calendar", label: "Calendar", icon: "📅" },
  { href: "/orbit/content-library", label: "Content Library", icon: "📚" },
  { href: "/orbit/ai-agents", label: "AI Agents", icon: "🤖" },
  { href: "/orbit/settings", label: "Settings", icon: "⚙️" },
];

export function OrbitSidebar({
  userEmail,
  userName,
}: {
  userEmail?: string | null;
  userName?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavContent = () => (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/orbit" className="flex items-center gap-2 font-bold" onClick={() => setOpen(false)}>
          <span>Orbit</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
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
