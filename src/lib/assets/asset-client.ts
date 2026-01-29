/**
 * Asset Management Client
 *
 * Client-side API wrapper for asset operations
 */

export interface Asset {
  id: string;
  workspaceId: string;
  folderId: string | null;
  folder?: {
    id: string;
    name: string;
  };
  filename: string;
  fileType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  url: string;
  altText: string | null;
  qualityScore: number | null;
  analysisJson?: any;
  uploadedBy?: {
    id: string;
    email: string;
    name: string | null;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
  tags?: Array<{
    id: string;
    name: string;
  }>;
  usage?: {
    posts: number;
    scheduledPosts: number;
    total: number;
  };
}

export interface AssetFolder {
  id: string;
  name: string;
  workspaceId: string;
  parentId: string | null;
  children?: Array<{
    id: string;
    name: string;
  }>;
  assetCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ListAssetsParams {
  workspaceId: string;
  folderId?: string;
  search?: string;
  fileType?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface PaginatedAssets {
  assets: Asset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface UploadAssetParams {
  workspaceId: string;
  file: File;
  folderId?: string;
}

export interface UpdateAssetParams {
  filename?: string;
  folderId?: string | null;
  tags?: string[];
}

export interface CreateFolderParams {
  workspaceId: string;
  name: string;
  parentId?: string;
}

export interface AssetAnalysisResult {
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
}

/**
 * Upload an asset to the content library
 */
export async function uploadAsset(
  params: UploadAssetParams,
): Promise<Asset> {
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

  const result = await response.json();
  return result.asset;
}

/**
 * List assets with optional filters
 */
export async function listAssets(
  params: ListAssetsParams,
): Promise<PaginatedAssets> {
  const searchParams = new URLSearchParams({
    workspaceId: params.workspaceId,
  });

  if (params.folderId) searchParams.set("folderId", params.folderId);
  if (params.search) searchParams.set("search", params.search);
  if (params.fileType) searchParams.set("fileType", params.fileType);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.tags) {
    params.tags.forEach((tag) => searchParams.append("tags", tag));
  }

  const response = await fetch(`/api/orbit/assets?${searchParams}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to list assets");
  }

  return response.json();
}

/**
 * Get a single asset by ID
 */
export async function getAsset(assetId: string): Promise<Asset> {
  const response = await fetch(`/api/orbit/assets/${assetId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch asset");
  }

  return response.json();
}

/**
 * Update asset metadata
 */
export async function updateAsset(
  assetId: string,
  params: UpdateAssetParams,
): Promise<Asset> {
  const response = await fetch(`/api/orbit/assets/${assetId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update asset");
  }

  const result = await response.json();
  return result.asset;
}

/**
 * Delete an asset
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
 * Trigger AI analysis for an asset
 */
export async function analyzeAsset(
  assetId: string,
): Promise<{
  analysis: AssetAnalysisResult;
  asset: Asset;
}> {
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
 * List folders for a workspace
 */
export async function listFolders(
  workspaceId: string,
): Promise<AssetFolder[]> {
  const response = await fetch(
    `/api/orbit/assets/folders?workspaceId=${workspaceId}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to list folders");
  }

  const result = await response.json();
  return result.folders;
}

/**
 * Create a new folder
 */
export async function createFolder(
  params: CreateFolderParams,
): Promise<AssetFolder> {
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

  const result = await response.json();
  return result.folder;
}

/**
 * Rename a folder
 */
export async function renameFolder(
  folderId: string,
  name: string,
): Promise<AssetFolder> {
  const response = await fetch("/api/orbit/assets/folders", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folderId, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to rename folder");
  }

  const result = await response.json();
  return result.folder;
}

/**
 * Delete a folder
 */
export async function deleteFolder(
  folderId: string,
  cascade = false,
): Promise<void> {
  const params = new URLSearchParams({
    folderId,
    cascade: String(cascade),
  });

  const response = await fetch(`/api/orbit/assets/folders?${params}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete folder");
  }
}
