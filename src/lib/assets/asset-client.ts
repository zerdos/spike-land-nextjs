/**
 * Client-side API wrapper for asset operations
 */

import type { Asset, AssetFolder, AssetTag, User } from "@prisma/client";

// Extended types with relations
export interface AssetWithRelations extends Asset {
  folder: AssetFolder | null;
  uploadedBy: Pick<User, "id" | "name" | "email" | "image">;
  tags: Array<{
    tag: AssetTag;
  }>;
  url: string | null;
  usageCount?: number;
}

export interface AssetFolderWithCounts extends AssetFolder {
  _count: {
    assets: number;
    children: number;
  };
  parent: Pick<AssetFolder, "id" | "name"> | null;
  createdBy: Pick<User, "id" | "name">;
}

export interface PaginatedAssets {
  assets: AssetWithRelations[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface AssetListFilters {
  workspaceId: string;
  folderId?: string | null;
  search?: string;
  tags?: string[];
  fileType?: "image" | "video";
  page?: number;
  limit?: number;
}

export interface UploadAssetParams {
  workspaceId: string;
  file: File;
  folderId?: string;
}

export interface UpdateAssetParams {
  assetId: string;
  filename?: string;
  folderId?: string | null;
  altText?: string;
  tags?: string[];
}

export interface CreateFolderParams {
  workspaceId: string;
  name: string;
  parentId?: string;
}

export interface UpdateFolderParams {
  folderId: string;
  name: string;
}

export interface AnalysisResult {
  success: boolean;
  analysis: {
    altText: string;
    qualityScore: number;
    suggestedTags: string[];
    analysisDetails: {
      mainSubject: string;
      imageStyle: string;
      technicalQuality: string;
      colorPalette?: string[];
      detectedObjects?: string[];
    };
  };
  appliedTags: Array<{ id: string; name: string }>;
}

/**
 * Upload asset to workspace content library
 */
export async function uploadAsset(
  params: UploadAssetParams,
): Promise<AssetWithRelations> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("workspaceId", params.workspaceId);
  if (params.folderId) {
    formData.append("folderId", params.folderId);
  }

  const response = await fetch("/api/orbit/assets/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload asset");
  }

  const data = await response.json();
  return data.asset;
}

/**
 * List assets with filters and pagination
 */
export async function listAssets(
  filters: AssetListFilters,
): Promise<PaginatedAssets> {
  const params = new URLSearchParams();
  params.set("workspaceId", filters.workspaceId);

  if (filters.folderId !== undefined) {
    params.set("folderId", filters.folderId || "");
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.tags) {
    filters.tags.forEach((tag) => params.append("tags[]", tag));
  }
  if (filters.fileType) {
    params.set("fileType", filters.fileType);
  }
  if (filters.page) {
    params.set("page", filters.page.toString());
  }
  if (filters.limit) {
    params.set("limit", filters.limit.toString());
  }

  const response = await fetch(`/api/orbit/assets?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to list assets");
  }

  return response.json();
}

/**
 * Get single asset with full details
 */
export async function getAsset(assetId: string): Promise<AssetWithRelations> {
  const response = await fetch(`/api/orbit/assets/${assetId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get asset");
  }

  const data = await response.json();
  return data.asset;
}

/**
 * Update asset metadata
 */
export async function updateAsset(
  params: UpdateAssetParams,
): Promise<AssetWithRelations> {
  const { assetId, ...body } = params;

  const response = await fetch(`/api/orbit/assets/${assetId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update asset");
  }

  const data = await response.json();
  return data.asset;
}

/**
 * Delete asset
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const response = await fetch(`/api/orbit/assets/${assetId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete asset");
  }
}

/**
 * Trigger AI analysis for asset
 */
export async function analyzeAsset(assetId: string): Promise<AnalysisResult> {
  const response = await fetch("/api/orbit/assets/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assetId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to analyze asset");
  }

  return response.json();
}

/**
 * List folders for workspace
 */
export async function listFolders(
  workspaceId: string,
): Promise<AssetFolderWithCounts[]> {
  const response = await fetch(
    `/api/orbit/assets/folders?workspaceId=${workspaceId}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to list folders");
  }

  const data = await response.json();
  return data.folders;
}

/**
 * Create new folder
 */
export async function createFolder(
  params: CreateFolderParams,
): Promise<AssetFolderWithCounts> {
  const response = await fetch("/api/orbit/assets/folders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create folder");
  }

  const data = await response.json();
  return data.folder;
}

/**
 * Update folder (rename)
 */
export async function updateFolder(
  params: UpdateFolderParams,
): Promise<AssetFolderWithCounts> {
  const response = await fetch("/api/orbit/assets/folders", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update folder");
  }

  const data = await response.json();
  return data.folder;
}

/**
 * Delete folder
 */
export async function deleteFolder(
  folderId: string,
  cascade: boolean = false,
): Promise<void> {
  const params = new URLSearchParams();
  params.set("folderId", folderId);
  if (cascade) {
    params.set("cascade", "true");
  }

  const response = await fetch(
    `/api/orbit/assets/folders?${params.toString()}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete folder");
  }
}
