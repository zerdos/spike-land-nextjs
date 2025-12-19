import { tryCatch } from "@/lib/try-catch";
import { useCallback, useEffect, useState } from "react";

/**
 * Album preview image from API response
 */
export interface AlbumPreviewImage {
  id: string;
  url: string;
  name: string;
}

/**
 * Album from API response
 */
export interface Album {
  id: string;
  name: string;
  description: string | null;
  privacy: "PRIVATE" | "UNLISTED" | "PUBLIC";
  coverImageId: string | null;
  imageCount: number;
  previewImages: AlbumPreviewImage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * API response shape for GET /api/albums
 */
interface AlbumsResponse {
  albums: Album[];
}

/**
 * Options for useUserAlbums hook
 */
export interface UseUserAlbumsOptions {
  /**
   * Filter albums by privacy level
   */
  privacy?: "PRIVATE" | "UNLISTED" | "PUBLIC";
  /**
   * Whether to fetch albums automatically (default: true)
   */
  enabled?: boolean;
}

/**
 * Return type for useUserAlbums hook
 */
export interface UseUserAlbumsReturn {
  /**
   * List of user's albums
   */
  albums: Album[];
  /**
   * Loading state
   */
  isLoading: boolean;
  /**
   * Error state (null if no error)
   */
  error: Error | null;
  /**
   * Refetch albums from API
   */
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching user's albums
 *
 * @param options - Configuration options
 * @returns Album data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * function MyAlbums() {
 *   const { albums, isLoading, error, refetch } = useUserAlbums();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {albums.map(album => (
 *         <div key={album.id}>{album.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Filter by privacy level
 * const { albums } = useUserAlbums({ privacy: "PUBLIC" });
 * ```
 *
 * @example
 * ```tsx
 * // Conditional fetching
 * const { albums, refetch } = useUserAlbums({ enabled: false });
 * // Later...
 * await refetch();
 * ```
 */
export function useUserAlbums(
  options: UseUserAlbumsOptions = {},
): UseUserAlbumsReturn {
  const { privacy, enabled = true } = options;

  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlbums = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Build query params if privacy filter is provided
    const params = new URLSearchParams();
    if (privacy) {
      params.set("privacy", privacy);
    }

    const url = `/api/albums${params.toString() ? `?${params.toString()}` : ""}`;

    const { data: response, error: fetchError } = await tryCatch(fetch(url));

    if (fetchError) {
      const errorMessage = fetchError instanceof Error
        ? fetchError.message
        : "An unknown error occurred";
      setError(new Error(errorMessage));
      setAlbums([]);
      setIsLoading(false);
      return;
    }

    if (!response.ok) {
      // Handle authentication errors gracefully
      if (response.status === 401) {
        setError(new Error("You must be logged in to view albums"));
      } else {
        setError(new Error(`Failed to fetch albums: ${response.statusText}`));
      }
      setAlbums([]);
      setIsLoading(false);
      return;
    }

    const { data: jsonData, error: jsonError } = await tryCatch(
      response.json() as Promise<AlbumsResponse>,
    );

    if (jsonError) {
      const errorMessage = jsonError instanceof Error
        ? jsonError.message
        : "An unknown error occurred";
      setError(new Error(errorMessage));
      setAlbums([]);
      setIsLoading(false);
      return;
    }

    setAlbums(jsonData.albums);
    setIsLoading(false);
  }, [privacy]);

  // Fetch on mount and when dependencies change (if enabled)
  useEffect(() => {
    if (enabled) {
      fetchAlbums();
    }
  }, [enabled, fetchAlbums]);

  return {
    albums,
    isLoading,
    error,
    refetch: fetchAlbums,
  };
}
