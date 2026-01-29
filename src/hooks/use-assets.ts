/**
 * React Query hooks for asset management
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  analyzeAsset,
  createFolder,
  deleteAsset,
  deleteFolder,
  getAsset,
  listAssets,
  listFolders,
  updateAsset,
  updateFolder,
  uploadAsset,
  type AnalysisResult,
  type AssetFolderWithCounts,
  type AssetListFilters,
  type AssetWithRelations,
  type CreateFolderParams,
  type PaginatedAssets,
  type UpdateAssetParams,
  type UpdateFolderParams,
  type UploadAssetParams,
} from "@/lib/assets/asset-client";

// Query keys
export const assetKeys = {
  all: ["assets"] as const,
  lists: () => [...assetKeys.all, "list"] as const,
  list: (filters: AssetListFilters) =>
    [...assetKeys.lists(), filters] as const,
  details: () => [...assetKeys.all, "detail"] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  folders: (workspaceId: string) =>
    [...assetKeys.all, "folders", workspaceId] as const,
};

/**
 * List assets with filters and pagination
 */
export function useAssets(
  filters: AssetListFilters,
  options?: Omit<
    UseQueryOptions<PaginatedAssets, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<PaginatedAssets, Error>({
    queryKey: assetKeys.list(filters),
    queryFn: () => listAssets(filters),
    ...options,
  });
}

/**
 * Get single asset with full details
 */
export function useAsset(
  assetId: string | null,
  options?: Omit<
    UseQueryOptions<AssetWithRelations, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<AssetWithRelations, Error>({
    queryKey: assetKeys.detail(assetId || ""),
    queryFn: () => {
      if (!assetId) throw new Error("Asset ID is required");
      return getAsset(assetId);
    },
    enabled: !!assetId,
    ...options,
  });
}

/**
 * Upload asset mutation
 */
export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation<AssetWithRelations, Error, UploadAssetParams>({
    mutationFn: uploadAsset,
    onSuccess: (_data, variables) => {
      // Invalidate asset lists for this workspace
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(),
        predicate: (query) => {
          const filters = query.queryKey[2] as AssetListFilters | undefined;
          return filters?.workspaceId === variables.workspaceId;
        },
      });

      // Invalidate folder counts if asset was uploaded to a folder
      if (variables.folderId) {
        queryClient.invalidateQueries({
          queryKey: assetKeys.folders(variables.workspaceId),
        });
      }
    },
  });
}

/**
 * Update asset mutation
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation<AssetWithRelations, Error, UpdateAssetParams>({
    mutationFn: updateAsset,
    onSuccess: (data, variables) => {
      // Update asset detail cache
      queryClient.setQueryData(
        assetKeys.detail(variables.assetId),
        data,
      );

      // Invalidate asset lists
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(),
      });

      // Invalidate folders if folder was changed
      if (variables.folderId !== undefined) {
        queryClient.invalidateQueries({
          queryKey: assetKeys.folders(data.workspaceId),
        });
      }
    },
  });
}

/**
 * Delete asset mutation
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteAsset,
    onSuccess: (_, assetId) => {
      // Remove asset from detail cache
      queryClient.removeQueries({
        queryKey: assetKeys.detail(assetId),
      });

      // Invalidate asset lists
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(),
      });

      // Invalidate folders
      queryClient.invalidateQueries({
        queryKey: [...assetKeys.all, "folders"],
      });
    },
  });
}

/**
 * Trigger AI analysis mutation
 */
export function useAnalyzeAsset() {
  const queryClient = useQueryClient();

  return useMutation<AnalysisResult, Error, string>({
    mutationFn: analyzeAsset,
    onSuccess: (_data, assetId) => {
      // Invalidate asset detail to refetch with new analysis
      queryClient.invalidateQueries({
        queryKey: assetKeys.detail(assetId),
      });

      // Invalidate asset lists (tags may have changed)
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(),
      });
    },
  });
}

/**
 * List folders for workspace
 */
export function useAssetFolders(
  workspaceId: string | null,
  options?: Omit<
    UseQueryOptions<AssetFolderWithCounts[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<AssetFolderWithCounts[], Error>({
    queryKey: assetKeys.folders(workspaceId || ""),
    queryFn: () => {
      if (!workspaceId) throw new Error("Workspace ID is required");
      return listFolders(workspaceId);
    },
    enabled: !!workspaceId,
    ...options,
  });
}

/**
 * Create folder mutation
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation<AssetFolderWithCounts, Error, CreateFolderParams>({
    mutationFn: createFolder,
    onSuccess: (_data, variables) => {
      // Invalidate folders list
      queryClient.invalidateQueries({
        queryKey: assetKeys.folders(variables.workspaceId),
      });
    },
  });
}

/**
 * Update folder mutation
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation<AssetFolderWithCounts, Error, UpdateFolderParams>({
    mutationFn: updateFolder,
    onSuccess: (data) => {
      // Invalidate folders list
      queryClient.invalidateQueries({
        queryKey: assetKeys.folders(data.workspaceId),
      });
    },
  });
}

/**
 * Delete folder mutation
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { folderId: string; workspaceId: string; cascade?: boolean }
  >({
    mutationFn: ({ folderId, cascade }) => deleteFolder(folderId, cascade),
    onSuccess: (_, variables) => {
      // Invalidate folders list
      queryClient.invalidateQueries({
        queryKey: assetKeys.folders(variables.workspaceId),
      });

      // Invalidate asset lists (assets may have been moved or deleted)
      queryClient.invalidateQueries({
        queryKey: assetKeys.lists(),
      });
    },
  });
}
