"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssetCard } from "@/components/orbit/AssetCard";
import { AssetDetailsPanel } from "@/components/orbit/AssetDetailsPanel";
import { AssetFilters } from "@/components/orbit/AssetFilters";
import { AssetUploadDialog } from "@/components/orbit/AssetUploadDialog";
import { FolderTreeView } from "@/components/orbit/FolderTreeView";
import { useAssets, useAssetFolders } from "@/hooks/use-assets";
import { Upload, Search, Plus, Folder } from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { tryCatch } from "@/lib/try-catch";
import type { Asset } from "@/lib/assets/asset-client";

export default function ContentLibraryPage() {
  const params = useParams();
  const workspaceSlug = params["workspaceSlug"] as string;

  // State
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);

  // Fetch workspace ID from slug
  useEffect(() => {
    async function fetchWorkspaceId() {
      const { data } = await tryCatch(
        fetch(`/api/orbit/workspaces/by-slug/${workspaceSlug}`).then((r) => r.json())
      );
      if (data?.workspace?.id) {
        setWorkspaceId(data.workspace.id);
      }
    }
    fetchWorkspaceId();
  }, [workspaceSlug]);

  // Queries
  const { data: foldersData } = useAssetFolders(workspaceId || "");
  const { data: assetsData, isLoading } = useAssets(
    {
      workspaceId: workspaceId || "",
      folderId: selectedFolderId || undefined,
      search: searchQuery || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      fileType: selectedFileTypes.length === 1 ? (selectedFileTypes[0] as "image" | "video") : undefined,
    },
    { enabled: !!workspaceId }
  );

  // Extract available tags and file types from assets
  const availableTags = useMemo(() => {
    if (!assetsData?.assets) return [];
    const tagSet = new Set<string>();
    assetsData.assets.forEach((asset) => {
      asset.tags?.forEach((tag) => {
        tagSet.add(tag.name);
      });
    });
    return Array.from(tagSet).sort();
  }, [assetsData]);

  const fileTypes = ["image", "video"];

  const handlePreview = (asset: Asset) => {
    setSelectedAssetId(asset.id);
    setDetailsPanelOpen(true);
  };

  const handleDelete = (asset: Asset) => {
    setSelectedAssetId(asset.id);
    setDetailsPanelOpen(true);
  };

  const handleClearFilters = () => {
    setSelectedFileTypes([]);
    setSelectedTags([]);
    setSearchQuery("");
  };

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Library</h1>
          <p className="text-muted-foreground">
            Manage and organize your media assets
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Assets
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Folders */}
        <div className="lg:col-span-1 space-y-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Folders</h3>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {foldersData && (
              <FolderTreeView
                folders={foldersData}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
              />
            )}
          </div>

          <AssetFilters
            fileTypes={fileTypes}
            selectedFileTypes={selectedFileTypes}
            onFileTypesChange={setSelectedFileTypes}
            tags={availableTags}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            onClearAll={handleClearFilters}
          />
        </div>

        {/* Asset Grid */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading assets...</p>
            </div>
          ) : assetsData?.assets.length === 0 ? (
            <div className="border rounded-lg p-12 text-center">
              <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No assets found</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first asset to get started
              </p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Assets
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {assetsData?.assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onPreview={handlePreview}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {assetsData && assetsData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={assetsData.pagination.page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {assetsData.pagination.page} of {assetsData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!assetsData.pagination.hasMore}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AssetUploadDialog
        workspaceId={workspaceId}
        folderId={selectedFolderId || undefined}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      <AssetDetailsPanel
        assetId={selectedAssetId}
        open={detailsPanelOpen}
        onOpenChange={setDetailsPanelOpen}
      />
    </div>
  );
}
