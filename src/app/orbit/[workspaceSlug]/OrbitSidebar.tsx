"use client";

import { UserAvatar } from "@/components/auth/user-avatar";
import { NotificationBell } from "@/components/orbit/notifications/notification-bell";
import { WorkspaceSwitcher } from "@/components/orbit/WorkspaceSwitcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";

const getNavItems = (workspaceSlug: string) => [
  { href: `/orbit/${workspaceSlug}/dashboard`, label: "Dashboard", icon: "📊" },
  { href: `/orbit/${workspaceSlug}/streams`, label: "Streams", icon: "📡" },
  { href: `/orbit/${workspaceSlug}/inbox`, label: "Inbox", icon: "📥" },
  { href: `/orbit/${workspaceSlug}/relay`, label: "Relay", icon: "📤" },
  {
    href: `/orbit/${workspaceSlug}/connections`,
    label: "Connections",
    icon: "👥",
  },
  { href: `/orbit/${workspaceSlug}/reminders`, label: "Reminders", icon: "🔔" },
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
  const navItems = getNavItems(workspaceSlug);

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between gap-2 px-1">
          <WorkspaceSwitcher />
          <NotificationBell workspaceSlug={workspaceSlug} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
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
      </SidebarFooter>
    </Sidebar>
  );
}
