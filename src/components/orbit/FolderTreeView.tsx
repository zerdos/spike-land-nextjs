"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AssetFolder } from "@/lib/assets/asset-client";
import { Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderTreeViewProps {
  folders: AssetFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function FolderTreeView({
  folders,
  selectedFolderId,
  onSelectFolder,
}: FolderTreeViewProps) {
  // Build folder tree structure
  const rootFolders = folders.filter((f) => !f.parentId);

  const getFolderChildren = (parentId: string): AssetFolder[] => {
    return folders.filter((f) => f.parentId === parentId);
  };

  const FolderItem = ({
    folder,
    level = 0,
  }: {
    folder: AssetFolder;
    level?: number;
  }) => {
    const children = getFolderChildren(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = children.length > 0;

    return (
      <div>
        <Button
          variant={isSelected ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start gap-2",
          )}
          style={{ paddingLeft: level > 0 ? `${1 + level}rem` : undefined }}
          onClick={() => onSelectFolder(folder.id)}
        >
          {isSelected ? (
            <FolderOpen className="h-4 w-4" />
          ) : (
            <Folder className="h-4 w-4" />
          )}
          <span className="flex-1 text-left truncate">{folder.name}</span>
          <span className="text-xs text-muted-foreground">
            {folder.assetCount || 0}
          </span>
        </Button>

        {hasChildren &&
          children.map((child) => (
            <FolderItem key={child.id} folder={child} level={level + 1} />
          ))}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        <Button
          variant={selectedFolderId === null ? "secondary" : "ghost"}
          className="w-full justify-start gap-2"
          onClick={() => onSelectFolder(null)}
        >
          <Folder className="h-4 w-4" />
          <span className="flex-1 text-left">All Assets</span>
        </Button>

        {rootFolders.map((folder) => (
          <FolderItem key={folder.id} folder={folder} />
        ))}
      </div>
    </ScrollArea>
  );
}
