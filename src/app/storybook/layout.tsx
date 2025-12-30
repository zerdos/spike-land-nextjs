"use client";

import { storybookIconMap, storybookSections } from "@/components/storybook";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Component, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void; }) {
  const pathname = usePathname();

  // Group sections by category
  const groupedSections = storybookSections.reduce((acc, section) => {
    const category = section.category || "General";
    if (!acc[category]) acc[category] = [];
    acc[category].push(section);
    return acc;
  }, {} as Record<string, typeof storybookSections[number][]>);

  const categories = Object.keys(groupedSections);

  return (
    <div className="flex flex-col h-full bg-background/40 backdrop-blur-xl">
      <div className="p-4">
        <Link href="/storybook" onClick={onLinkClick} className="group">
          <h1 className="text-xl font-bold font-heading bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
            Design System
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest font-semibold opacity-70">
            spike.land design system
          </p>
        </Link>
      </div>

      <div className="px-3 mb-2">
        <Link
          href="/storybook"
          onClick={onLinkClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative group",
            pathname === "/storybook"
              ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary),0.1)]"
              : "text-muted-foreground hover:text-foreground hover:bg-white/10",
          )}
        >
          {pathname === "/storybook" && (
            <div className="absolute left-0 w-1 h-4 bg-primary rounded-r-full" />
          )}
          <Component
            className={cn(
              "h-4 w-4",
              pathname === "/storybook"
                ? "text-primary"
                : "opacity-70 group-hover:opacity-100",
            )}
          />
          Overview
        </Link>
      </div>

      <nav className="flex-1 px-4 pb-8 space-y-6 overflow-y-auto scrollbar-hide relative group/nav">
        {/* Scroll affordance gradient */}
        <div className="sticky top-0 h-4 bg-gradient-to-b from-background/0 to-transparent z-10 pointer-events-none" />

        {categories.map((category) => (
          <div key={category} className="space-y-0.5">
            <h3 className="px-3 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] mb-1.5">
              {category}
            </h3>
            <div className="space-y-0.5">
              {groupedSections[category]?.map((section) => {
                const Icon = storybookIconMap[
                  section.icon as keyof typeof storybookIconMap
                ];
                const isActive = pathname === `/storybook/${section.id}`;

                return (
                  <Link
                    key={section.id}
                    href={`/storybook/${section.id}`}
                    onClick={onLinkClick}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                      isActive
                        ? "bg-primary/10 text-primary font-bold shadow-[inset_0_0_0_1px_rgba(var(--primary),0.1)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-sm" />
                    )}
                    {Icon && (
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-transform group-hover:scale-110",
                          isActive
                            ? "text-primary"
                            : "opacity-60 group-hover:opacity-100",
                        )}
                      />
                    )}
                    {section.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Bottom scroll affordance */}
        <div className="sticky bottom-0 h-8 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
      </nav>

      <div className="p-4 border-t border-white/5 bg-black/10">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Version 1.2.0
          </span>
        </div>
        <p className="text-[9px] text-muted-foreground leading-snug opacity-50">
          Built for Spike Land Platform<br />
          © 2024 spike.land
        </p>
      </div>
    </div>
  );
}

export default function StorybookLayout(
  { children }: { children: React.ReactNode; },
) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#040408] selection:bg-primary/30">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/storybook">
            <span className="font-bold font-heading">Design System</span>
          </Link>
          {isMounted
            ? (
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SheetTitle className="sr-only">
                    Design System Navigation
                  </SheetTitle>
                  <SidebarContent onLinkClick={() => setOpen(false)} />
                </SheetContent>
              </Sheet>
            )
            : (
              <Button variant="ghost" size="icon" aria-label="Toggle menu">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            )}
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border bg-background/50 backdrop-blur-sm">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-64">
          <div className="container mx-auto py-8 px-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
