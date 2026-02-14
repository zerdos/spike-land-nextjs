"use client";

import { Button } from "@/components/ui/button";
import { useSwarmStore } from "@/lib/admin/swarm/store";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  Bot,
  ChevronLeft,
  ChevronRight,
  Globe,
  LayoutDashboard,
  Map,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/swarm", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/swarm/environments", label: "Environments", icon: Globe },
  { href: "/admin/swarm/agents", label: "Agents", icon: Bot },
  { href: "/admin/swarm/roadmap", label: "Roadmap", icon: Map },
  { href: "/admin/swarm/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/swarm/notifications", label: "Notifications", icon: Bell },
];

export function SwarmSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useSwarmStore();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border/40 bg-card/50 transition-all duration-200",
        sidebarCollapsed ? "w-16" : "w-56",
      )}
    >
      <div className="flex items-center justify-between border-b border-border/40 p-3">
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold tracking-tight">Swarm</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin/swarm" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                sidebarCollapsed && "justify-center px-0",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
