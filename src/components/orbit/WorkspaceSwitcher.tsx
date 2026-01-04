"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Plus } from "lucide-react";
import { getGraphemes } from "./constants";
import { useWorkspace } from "./WorkspaceContext";

/**
 * Dropdown component for switching between workspaces.
 * Displays the current workspace and allows selection from all available workspaces.
 *
 * @example
 * ```tsx
 * <WorkspaceSwitcher />
 * ```
 */
export function WorkspaceSwitcher() {
  const { workspace, workspaces, isLoading, switchWorkspace } = useWorkspace();

  if (isLoading) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start gap-2"
        disabled
        data-testid="workspace-switcher-loading"
      >
        <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
        <span className="animate-pulse text-muted-foreground">Loading...</span>
      </Button>
    );
  }

  if (!workspace) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start gap-2"
        disabled
        data-testid="workspace-switcher-empty"
      >
        <div className="h-6 w-6 rounded-full bg-muted" />
        <span className="text-muted-foreground">No workspace</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between gap-2"
          data-testid="workspace-switcher-trigger"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Avatar className="h-6 w-6">
              <AvatarImage src={workspace.avatarUrl ?? undefined} alt={workspace.name} />
              <AvatarFallback className="text-xs">
                {workspace.isPersonal ? "Me" : getGraphemes(workspace.name, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">{workspace.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => switchWorkspace(ws.slug)}
            className="gap-2"
            data-testid={`workspace-option-${ws.slug}`}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={ws.avatarUrl ?? undefined} alt={ws.name} />
              <AvatarFallback className="text-xs">
                {ws.isPersonal ? "Me" : getGraphemes(ws.name, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm">{ws.name}</span>
              {ws.isPersonal && <span className="text-xs text-muted-foreground">Personal</span>}
            </div>
            {ws.slug === workspace.slug && (
              <Check className="h-4 w-4 text-primary" data-testid="workspace-active-check" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2" disabled data-testid="create-workspace-option">
          <Plus className="h-4 w-4" />
          <span>Create Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
