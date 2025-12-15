"use client";

import { storybookSections } from "@/components/storybook";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Accessibility,
  Bell,
  Component,
  Loader,
  Menu,
  MousePointerClick,
  Palette,
  PanelTop,
  Sparkles,
  SplitSquareHorizontal,
  Type,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useState } from "react";

const iconMap = {
  Sparkles,
  Palette,
  Type,
  MousePointerClick,
  Component,
  SplitSquareHorizontal,
  Bell,
  Loader,
  PanelTop,
  Accessibility,
};

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void; }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <Link href="/storybook" onClick={onLinkClick}>
          <h1 className="text-2xl font-bold font-heading">Design System</h1>
          <p className="text-sm text-muted-foreground mt-1">Pixel Brand Guidelines</p>
        </Link>
      </div>

      <Separator />

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <Link
          href="/storybook"
          onClick={onLinkClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === "/storybook"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <Component className="h-4 w-4" />
          Overview
        </Link>

        <Separator className="my-3" />

        {storybookSections.map((section) => {
          const Icon = iconMap[section.icon as keyof typeof iconMap];
          const isActive = pathname === `/storybook/${section.id}`;

          return (
            <Link
              key={section.id}
              href={`/storybook/${section.id}`}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {section.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="p-4 text-xs text-muted-foreground">
        <p>Pixel Design System v1.0</p>
        <p className="mt-1">Part of the Spike Land Platform</p>
      </div>
    </div>
  );
}

export default function StorybookLayout({ children }: { children: React.ReactNode; }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#08081C] via-[#0c1020] to-[#08081C]">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/storybook">
            <span className="font-bold font-heading">Design System</span>
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarContent onLinkClick={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 border-r border-border bg-background/50 backdrop-blur-sm">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-72">
          <div className="container mx-auto py-8 px-4 max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
