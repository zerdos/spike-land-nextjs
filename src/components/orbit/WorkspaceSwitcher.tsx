"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Clock, Plus, Star } from "lucide-react";
import { useMemo } from "react";
import { getGraphemes } from "./constants";
import { useWorkspace } from "./WorkspaceContext";

/**
 * Dropdown component for switching between workspaces.
 * Displays the current workspace with sections for favorites and recent workspaces.
 *
 * @example
 * ```tsx
 * <WorkspaceSwitcher />
 * ```
 */
export function WorkspaceSwitcher() {
  const {
    workspace,
    workspaces,
    isLoading,
    switchWorkspace,
    favoriteIds,
    recentIds,
    toggleFavorite,
  } = useWorkspace();

  // Filter workspaces into sections
  const { favorites, recent, others } = useMemo(() => {
    const favoriteSet = new Set(favoriteIds);

    // Favorites (excluding current)
    const favoriteWorkspaces = workspaces.filter(
      (ws) => favoriteSet.has(ws.id) && ws.slug !== workspace?.slug,
    );

    // Recent (excluding current and favorites)
    const recentWorkspaces = recentIds
      .filter((id) => !favoriteSet.has(id))
      .map((id) => workspaces.find((ws) => ws.id === id))
      .filter((ws): ws is NonNullable<typeof ws> => ws !== undefined && ws.slug !== workspace?.slug)
      .slice(0, 3); // Limit to 3 recent

    // Others (excluding current, favorites, and recent)
    const shownIds = new Set([
      ...favoriteIds,
      ...recentWorkspaces.map((ws) => ws.id),
      workspace?.id,
    ]);
    const otherWorkspaces = workspaces.filter(
      (ws) => !shownIds.has(ws.id),
    );

    return {
      favorites: favoriteWorkspaces,
      recent: recentWorkspaces,
      others: otherWorkspaces,
    };
  }, [workspaces, favoriteIds, recentIds, workspace]);

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

  const handleToggleFavorite = async (
    e: React.MouseEvent,
    workspaceId: string,
  ) => {
    e.stopPropagation();
    await toggleFavorite(workspaceId);
  };

  const renderWorkspaceItem = (
    ws: typeof workspaces[number],
    showFavoriteStar = true,
  ) => (
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
      {showFavoriteStar && (
        <button
          onClick={(e) => handleToggleFavorite(e, ws.id)}
          className="p-1 hover:bg-accent rounded"
          aria-label={ws.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            className={`h-4 w-4 ${
              ws.isFavorite
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      )}
      {ws.slug === workspace.slug && (
        <Check
          className="h-4 w-4 text-primary"
          data-testid="workspace-active-check"
        />
      )}
    </DropdownMenuItem>
  );

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
              <AvatarImage
                src={workspace.avatarUrl ?? undefined}
                alt={workspace.name}
              />
              <AvatarFallback className="text-xs">
                {workspace.isPersonal
                  ? "Me"
                  : getGraphemes(workspace.name, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">
              {workspace.name}
            </span>
            {workspace.isFavorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        {/* Favorites Section */}
        {favorites.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Star className="h-3 w-3" />
              Favorites
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {favorites.map((ws) => renderWorkspaceItem(ws))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Recent Section */}
        {recent.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Recent
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {recent.map((ws) => renderWorkspaceItem(ws))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* All Workspaces Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          All Workspaces
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {/* Current workspace first */}
          {renderWorkspaceItem(workspace)}
          {/* Then others */}
          {others.map((ws) => renderWorkspaceItem(ws))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          disabled
          data-testid="create-workspace-option"
        >
          <Plus className="h-4 w-4" />
          <span>Create Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
