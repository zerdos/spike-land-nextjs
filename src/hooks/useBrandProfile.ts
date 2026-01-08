"use client";

import { tryCatch } from "@/lib/try-catch";
import type {
  BrandProfileFormData,
  ColorPaletteItem,
  Guardrail,
  ToneDescriptors,
  VocabularyItem,
} from "@/lib/validations/brand-brain";
import { useCallback, useEffect, useState } from "react";

/**
 * Brand profile data returned from the API
 */
export interface BrandProfileData {
  id: string;
  workspaceId: string;
  name: string;
  mission: string | null;
  values: string[] | null;
  toneDescriptors: ToneDescriptors | null;
  logoUrl: string | null;
  logoR2Key: string | null;
  colorPalette: ColorPaletteItem[] | null;
  guardrails: Guardrail[];
  vocabulary: VocabularyItem[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface UseBrandProfileOptions {
  /**
   * Workspace ID to fetch brand profile for
   */
  workspaceId: string;
  /**
   * Whether to fetch on mount (default: true)
   */
  enabled?: boolean;
}

interface UseBrandProfileReturn {
  // Data
  brandProfile: BrandProfileData | null;
  hasProfile: boolean;

  // States
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: Error | null;

  // Actions
  refetch: () => Promise<void>;
  createProfile: (
    data: BrandProfileFormData,
  ) => Promise<BrandProfileData | null>;
  updateProfile: (
    data: Partial<BrandProfileFormData>,
  ) => Promise<BrandProfileData | null>;
  deleteProfile: () => Promise<boolean>;
}

/**
 * Hook for managing brand profile data
 *
 * @example
 * ```tsx
 * const {
 *   brandProfile,
 *   hasProfile,
 *   isLoading,
 *   createProfile,
 *   updateProfile,
 * } = useBrandProfile({ workspaceId: "workspace-123" });
 * ```
 */
export function useBrandProfile({
  workspaceId,
  enabled = true,
}: UseBrandProfileOptions): UseBrandProfileReturn {
  const [brandProfile, setBrandProfile] = useState<BrandProfileData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const hasProfile = brandProfile !== null;

  /**
   * Fetch the brand profile
   */
  const fetchBrandProfile = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    setError(null);

    const { data: response, error: fetchError } = await tryCatch(
      fetch(`/api/workspaces/${workspaceId}/brand-profile`),
    );

    if (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError
          : new Error("Failed to fetch brand profile"),
      );
      setIsLoading(false);
      return;
    }

    if (!response) {
      setError(new Error("No response from server"));
      setIsLoading(false);
      return;
    }

    // 404 means no profile exists yet - not an error
    if (response.status === 404) {
      setBrandProfile(null);
      setIsLoading(false);
      return;
    }

    if (!response.ok) {
      if (response.status === 401) {
        setError(new Error("Unauthorized"));
        setIsLoading(false);
        return;
      }
      if (response.status === 403) {
        setError(new Error("Permission denied"));
        setIsLoading(false);
        return;
      }
      setError(new Error("Failed to fetch brand profile"));
      setIsLoading(false);
      return;
    }

    const { data, error: jsonError } = await tryCatch(
      response.json() as Promise<BrandProfileData>,
    );

    if (jsonError) {
      setError(
        jsonError instanceof Error
          ? jsonError
          : new Error("Failed to parse response"),
      );
      setIsLoading(false);
      return;
    }

    setBrandProfile(data);
    setError(null);
    setIsLoading(false);
  }, [workspaceId]);

  /**
   * Create a new brand profile
   */
  const createProfile = useCallback(
    async (data: BrandProfileFormData): Promise<BrandProfileData | null> => {
      if (!workspaceId) return null;

      setIsCreating(true);
      setError(null);

      const { data: response, error: fetchError } = await tryCatch(
        fetch(`/api/workspaces/${workspaceId}/brand-profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      );

      if (fetchError) {
        const err = fetchError instanceof Error
          ? fetchError
          : new Error("Failed to create brand profile");
        setError(err);
        setIsCreating(false);
        throw err;
      }

      if (!response || !response.ok) {
        const errorData = response
          ? await response.json().catch(() => ({}))
          : {};
        const err = new Error(
          errorData.error || "Failed to create brand profile",
        );
        setError(err);
        setIsCreating(false);
        throw err;
      }

      const { data: profile, error: jsonError } = await tryCatch(
        response.json() as Promise<BrandProfileData>,
      );

      if (jsonError) {
        const err = jsonError instanceof Error
          ? jsonError
          : new Error("Failed to parse response");
        setError(err);
        setIsCreating(false);
        throw err;
      }

      setBrandProfile(profile);
      setError(null);
      setIsCreating(false);
      return profile;
    },
    [workspaceId],
  );

  /**
   * Update the brand profile
   */
  const updateProfile = useCallback(
    async (
      data: Partial<BrandProfileFormData>,
    ): Promise<BrandProfileData | null> => {
      if (!workspaceId) return null;

      setIsUpdating(true);
      setError(null);

      const { data: response, error: fetchError } = await tryCatch(
        fetch(`/api/workspaces/${workspaceId}/brand-profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      );

      if (fetchError) {
        const err = fetchError instanceof Error
          ? fetchError
          : new Error("Failed to update brand profile");
        setError(err);
        setIsUpdating(false);
        throw err;
      }

      if (!response || !response.ok) {
        const errorData = response
          ? await response.json().catch(() => ({}))
          : {};
        const err = new Error(
          errorData.error || "Failed to update brand profile",
        );
        setError(err);
        setIsUpdating(false);
        throw err;
      }

      const { data: profile, error: jsonError } = await tryCatch(
        response.json() as Promise<BrandProfileData>,
      );

      if (jsonError) {
        const err = jsonError instanceof Error
          ? jsonError
          : new Error("Failed to parse response");
        setError(err);
        setIsUpdating(false);
        throw err;
      }

      setBrandProfile(profile);
      setError(null);
      setIsUpdating(false);
      return profile;
    },
    [workspaceId],
  );

  /**
   * Delete the brand profile
   */
  const deleteProfile = useCallback(async (): Promise<boolean> => {
    if (!workspaceId) return false;

    setIsDeleting(true);
    setError(null);

    const { data: response, error: fetchError } = await tryCatch(
      fetch(`/api/workspaces/${workspaceId}/brand-profile`, {
        method: "DELETE",
      }),
    );

    if (fetchError) {
      const err = fetchError instanceof Error
        ? fetchError
        : new Error("Failed to delete brand profile");
      setError(err);
      setIsDeleting(false);
      throw err;
    }

    if (!response || !response.ok) {
      const errorData = response ? await response.json().catch(() => ({})) : {};
      const err = new Error(
        errorData.error || "Failed to delete brand profile",
      );
      setError(err);
      setIsDeleting(false);
      throw err;
    }

    setBrandProfile(null);
    setError(null);
    setIsDeleting(false);
    return true;
  }, [workspaceId]);

  // Fetch on mount if enabled
  useEffect(() => {
    if (enabled && workspaceId) {
      fetchBrandProfile();
    }
  }, [enabled, workspaceId, fetchBrandProfile]);

  return {
    // Data
    brandProfile,
    hasProfile,

    // States
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,

    // Actions
    refetch: fetchBrandProfile,
    createProfile,
    updateProfile,
    deleteProfile,
  };
}
