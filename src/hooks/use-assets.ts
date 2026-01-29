/**
 * React Query Hooks for Asset Management
 *
 * Provides hooks for interacting with the asset API
 */

import {
  analyzeAsset,
  type Asset,
  type AssetAnalysisResult,
  type AssetFolder,
  createFolder,
  type CreateFolderParams,
  deleteAsset,
  deleteFolder,
  getAsset,
  listAssets,
  type ListAssetsParams,
  listFolders,
  type PaginatedAssets,
  renameFolder,
  updateAsset,
  type UpdateAssetParams,
  uploadAsset,
  type UploadAssetParams,
} from "@/lib/assets/asset-client";
import {
  useMutation,
  type UseMutationOptions,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

// Query keys
export const assetKeys = {
  all: ["assets"] as const,
  lists: () => [...assetKeys.all, "list"] as const,
  list: (params: ListAssetsParams) => [...assetKeys.lists(), params] as const,
  details: () => [...assetKeys.all, "detail"] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  folders: (workspaceId: string) => [...assetKeys.all, "folders", workspaceId] as const,
};

/**
 * Hook to fetch paginated list of assets
 */
export function useAssets(
  params: ListAssetsParams,
  options?: Omit<
    UseQueryOptions<PaginatedAssets, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<PaginatedAssets, Error>({
    queryKey: assetKeys.list(params),
    queryFn: () => listAssets(params),
    ...options,
  });
}

/**
 * Hook to fetch single asset details
 */
export function useAsset(
  assetId: string,
  options?: Omit<UseQueryOptions<Asset, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<Asset, Error>({
    queryKey: assetKeys.detail(assetId),
    queryFn: () => getAsset(assetId),
    enabled: !!assetId,
    ...options,
  });
}

/**
 * Hook to upload an asset
 */
export function useUploadAsset(
  options?: UseMutationOptions<Asset, Error, UploadAssetParams>,
) {
  const queryClient = useQueryClient();

  return useMutation<Asset, Error, UploadAssetParams>({
    mutationFn: uploadAsset,
    onSuccess: () => {
      // Invalidate asset lists to refetch with new asset
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to update asset metadata
 */
export function useUpdateAsset(
  options?: UseMutationOptions<
    Asset,
    Error,
    { assetId: string; params: UpdateAssetParams; }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<
    Asset,
    Error,
    { assetId: string; params: UpdateAssetParams; }
  >({
    mutationFn: ({ assetId, params }) => updateAsset(assetId, params),
    onSuccess: (data, variables) => {
      // Update cached asset
      queryClient.setQueryData(assetKeys.detail(variables.assetId), data);

      // Invalidate lists to refetch with updated asset
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to delete an asset
 */
export function useDeleteAsset(
  options?: UseMutationOptions<void, Error, string>,
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteAsset,
    onSuccess: (_, assetId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: assetKeys.detail(assetId) });

      // Invalidate lists to refetch without deleted asset
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to trigger AI analysis for an asset
 */
export function useAnalyzeAsset(
  options?: UseMutationOptions<
    { analysis: AssetAnalysisResult; asset: Asset; },
    Error,
    string
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<
    { analysis: AssetAnalysisResult; asset: Asset; },
    Error,
    string
  >({
    mutationFn: analyzeAsset,
    onSuccess: (data, assetId) => {
      // Update cached asset with analysis results
      queryClient.setQueryData(assetKeys.detail(assetId), data.asset);

      // Invalidate lists to refetch with updated asset
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to fetch folders for a workspace
 */
export function useAssetFolders(
  workspaceId: string,
  options?: Omit<UseQueryOptions<AssetFolder[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery<AssetFolder[], Error>({
    queryKey: assetKeys.folders(workspaceId),
    queryFn: () => listFolders(workspaceId),
    enabled: !!workspaceId,
    ...options,
  });
}

/**
 * Hook to create a folder
 */
export function useCreateFolder(
  options?: UseMutationOptions<AssetFolder, Error, CreateFolderParams>,
) {
  const queryClient = useQueryClient();

  return useMutation<AssetFolder, Error, CreateFolderParams>({
    mutationFn: createFolder,
    onSuccess: (_, variables) => {
      // Invalidate folders to refetch with new folder
      queryClient.invalidateQueries({
        queryKey: assetKeys.folders(variables.workspaceId),
      });
    },
    ...options,
  });
}

/**
 * Hook to rename a folder
 */
export function useRenameFolder(
  options?: UseMutationOptions<
    AssetFolder,
    Error,
    { folderId: string; name: string; workspaceId: string; }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<
    AssetFolder,
    Error,
    { folderId: string; name: string; workspaceId: string; }
  >({
    mutationFn: ({ folderId, name }) => renameFolder(folderId, name),
    onSuccess: (_, variables) => {
      // Invalidate folders to refetch with renamed folder
      queryClient.invalidateQueries({
        queryKey: assetKeys.folders(variables.workspaceId),
      });
    },
    ...options,
  });
}

/**
 * Hook to delete a folder
 */
export function useDeleteFolder(
  options?: UseMutationOptions<
    void,
    Error,
    { folderId: string; workspaceId: string; cascade?: boolean; }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { folderId: string; workspaceId: string; cascade?: boolean; }
  >({
    mutationFn: ({ folderId, cascade }) => deleteFolder(folderId, cascade),
    onSuccess: (_, variables) => {
      // Invalidate folders to refetch without deleted folder
      queryClient.invalidateQueries({
        queryKey: assetKeys.folders(variables.workspaceId),
      });

      // Invalidate asset lists (assets may have been moved or deleted)
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
    ...options,
  });
}
