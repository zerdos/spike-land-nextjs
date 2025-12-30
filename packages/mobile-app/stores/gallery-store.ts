/**
 * Gallery Store
 * Manages gallery state with Zustand including images, albums, and selection
 */

import type { Album, EnhancedImage, EnhancementTier } from "@spike-npm-land/shared";
import { create } from "zustand";
import {
  addImagesToAlbum,
  batchEnhanceImages,
  createAlbum,
  deleteAlbum,
  deleteImage,
  getAlbums,
  getImages,
  type ImagesListParams,
  updateAlbum,
} from "../services/api/images";

// ============================================================================
// Types
// ============================================================================

export type SortOption =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | "size_asc"
  | "size_desc";

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface ImageFilters {
  albumIds: string[];
  dateRange: DateRange;
}

interface GalleryState {
  // Images
  images: EnhancedImage[];
  totalImages: number;
  currentPage: number;
  isLoadingImages: boolean;
  hasMoreImages: boolean;

  // Search and Filters
  searchQuery: string;
  filters: ImageFilters;
  sortBy: SortOption;

  // Albums
  albums: Album[];
  isLoadingAlbums: boolean;
  selectedAlbumId: string | null;

  // Selection mode
  isSelectionMode: boolean;
  selectedImageIds: Set<string>;

  // Slideshow
  slideshowIndex: number;
  isSlideshowActive: boolean;
  slideshowAutoAdvance: boolean;
  slideshowInterval: number; // in seconds

  // Errors
  error: string | null;
}

interface GalleryActions {
  // Image actions
  fetchImages: (params?: ImagesListParams) => Promise<void>;
  fetchMoreImages: () => Promise<void>;
  refreshImages: () => Promise<void>;
  removeImage: (imageId: string) => Promise<boolean>;

  // Search and Filter actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<ImageFilters>) => void;
  resetFilters: () => void;
  setSortBy: (sortBy: SortOption) => void;
  clearSearch: () => void;

  // Album actions
  fetchAlbums: () => Promise<void>;
  createNewAlbum: (params: {
    name: string;
    description?: string;
    privacy?: "PRIVATE" | "UNLISTED" | "PUBLIC";
    defaultTier?: EnhancementTier;
  }) => Promise<Album | null>;
  updateExistingAlbum: (
    albumId: string,
    params: Partial<{
      name: string;
      description: string;
      privacy: "PRIVATE" | "UNLISTED" | "PUBLIC";
      defaultTier: EnhancementTier;
    }>,
  ) => Promise<boolean>;
  removeAlbum: (albumId: string) => Promise<boolean>;
  setSelectedAlbum: (albumId: string | null) => void;
  addSelectedImagesToAlbum: (albumId: string) => Promise<boolean>;

  // Selection actions
  toggleSelectionMode: () => void;
  toggleImageSelection: (imageId: string) => void;
  selectAllImages: () => void;
  clearSelection: () => void;

  // Batch actions
  batchEnhance: (tier: EnhancementTier) => Promise<boolean>;
  batchDelete: () => Promise<boolean>;

  // Slideshow actions
  startSlideshow: (startIndex?: number) => void;
  stopSlideshow: () => void;
  nextSlide: () => void;
  previousSlide: () => void;
  goToSlide: (index: number) => void;
  toggleAutoAdvance: () => void;
  setSlideshowInterval: (seconds: number) => void;

  // Utility
  clearError: () => void;
  reset: () => void;
}

type GalleryStore = GalleryState & GalleryActions;

// ============================================================================
// Constants
// ============================================================================

const IMAGES_PER_PAGE = 20;

/**
 * Convert sort option to API parameters
 */
function sortOptionToApiParams(sortBy: SortOption): {
  sortBy: "createdAt" | "name" | "size";
  sortOrder: "asc" | "desc";
} {
  switch (sortBy) {
    case "newest":
      return { sortBy: "createdAt", sortOrder: "desc" };
    case "oldest":
      return { sortBy: "createdAt", sortOrder: "asc" };
    case "name_asc":
      return { sortBy: "name", sortOrder: "asc" };
    case "name_desc":
      return { sortBy: "name", sortOrder: "desc" };
    case "size_asc":
      return { sortBy: "size", sortOrder: "asc" };
    case "size_desc":
      return { sortBy: "size", sortOrder: "desc" };
    default:
      return { sortBy: "createdAt", sortOrder: "desc" };
  }
}

/**
 * Format date to ISO string (date only)
 */
function formatDateToIso(date: Date | null): string | undefined {
  if (!date) return undefined;
  return date.toISOString().split("T")[0];
}

const DEFAULT_FILTERS: ImageFilters = {
  albumIds: [],
  dateRange: {
    startDate: null,
    endDate: null,
  },
};

const initialState: GalleryState = {
  images: [],
  totalImages: 0,
  currentPage: 1,
  isLoadingImages: false,
  hasMoreImages: true,

  searchQuery: "",
  filters: DEFAULT_FILTERS,
  sortBy: "newest",

  albums: [],
  isLoadingAlbums: false,
  selectedAlbumId: null,

  isSelectionMode: false,
  selectedImageIds: new Set(),

  slideshowIndex: 0,
  isSlideshowActive: false,
  slideshowAutoAdvance: false,
  slideshowInterval: 5,

  error: null,
};

// ============================================================================
// Store
// ============================================================================

export const useGalleryStore = create<GalleryStore>((set, get) => ({
  ...initialState,

  // ============================================================================
  // Image Actions
  // ============================================================================

  fetchImages: async (params?: ImagesListParams) => {
    set({ isLoadingImages: true, error: null });

    const { selectedAlbumId, searchQuery, filters, sortBy } = get();

    // Build search params from store state
    const { sortBy: apiSortBy, sortOrder } = sortOptionToApiParams(sortBy);
    const albumId = filters.albumIds.length > 0
      ? filters.albumIds[0]
      : selectedAlbumId || params?.albumId;

    const response = await getImages({
      page: 1,
      limit: IMAGES_PER_PAGE,
      albumId,
      search: searchQuery.trim() || undefined,
      sortBy: apiSortBy,
      sortOrder,
      startDate: formatDateToIso(filters.dateRange.startDate),
      endDate: formatDateToIso(filters.dateRange.endDate),
      ...params,
    });

    if (response.error) {
      set({ isLoadingImages: false, error: response.error });
      return;
    }

    if (response.data) {
      set({
        images: response.data.images,
        totalImages: response.data.total,
        currentPage: response.data.page,
        hasMoreImages: response.data.images.length === IMAGES_PER_PAGE,
        isLoadingImages: false,
      });
    }
  },

  fetchMoreImages: async () => {
    const {
      isLoadingImages,
      hasMoreImages,
      currentPage,
      images,
      selectedAlbumId,
      searchQuery,
      filters,
      sortBy,
    } = get();

    if (isLoadingImages || !hasMoreImages) return;

    set({ isLoadingImages: true });

    // Build search params from store state
    const { sortBy: apiSortBy, sortOrder } = sortOptionToApiParams(sortBy);
    const albumId = filters.albumIds.length > 0
      ? filters.albumIds[0]
      : selectedAlbumId || undefined;

    const response = await getImages({
      page: currentPage + 1,
      limit: IMAGES_PER_PAGE,
      albumId,
      search: searchQuery.trim() || undefined,
      sortBy: apiSortBy,
      sortOrder,
      startDate: formatDateToIso(filters.dateRange.startDate),
      endDate: formatDateToIso(filters.dateRange.endDate),
    });

    if (response.error) {
      set({ isLoadingImages: false, error: response.error });
      return;
    }

    if (response.data) {
      set({
        images: [...images, ...response.data.images],
        currentPage: response.data.page,
        hasMoreImages: response.data.images.length === IMAGES_PER_PAGE,
        isLoadingImages: false,
      });
    }
  },

  refreshImages: async () => {
    set({ currentPage: 1, hasMoreImages: true });
    await get().fetchImages();
  },

  removeImage: async (imageId: string) => {
    const response = await deleteImage(imageId);

    if (response.error) {
      set({ error: response.error });
      return false;
    }

    set((state) => ({
      images: state.images.filter((img) => img.id !== imageId),
      totalImages: state.totalImages - 1,
      selectedImageIds: new Set(
        [...state.selectedImageIds].filter((id) => id !== imageId),
      ),
    }));

    return true;
  },

  // ============================================================================
  // Search and Filter Actions
  // ============================================================================

  setSearchQuery: (query: string) => {
    set({ searchQuery: query, currentPage: 1, hasMoreImages: true });
    get().fetchImages();
  },

  setFilters: (partialFilters: Partial<ImageFilters>) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...partialFilters,
        dateRange: partialFilters.dateRange
          ? { ...state.filters.dateRange, ...partialFilters.dateRange }
          : state.filters.dateRange,
      },
      currentPage: 1,
      hasMoreImages: true,
    }));
    get().fetchImages();
  },

  resetFilters: () => {
    set({
      filters: DEFAULT_FILTERS,
      currentPage: 1,
      hasMoreImages: true,
    });
    get().fetchImages();
  },

  setSortBy: (newSortBy: SortOption) => {
    set({ sortBy: newSortBy, currentPage: 1, hasMoreImages: true });
    get().fetchImages();
  },

  clearSearch: () => {
    set({
      searchQuery: "",
      filters: DEFAULT_FILTERS,
      sortBy: "newest",
      currentPage: 1,
      hasMoreImages: true,
    });
    get().fetchImages();
  },

  // ============================================================================
  // Album Actions
  // ============================================================================

  fetchAlbums: async () => {
    set({ isLoadingAlbums: true, error: null });

    const response = await getAlbums();

    if (response.error) {
      set({ isLoadingAlbums: false, error: response.error });
      return;
    }

    if (response.data) {
      set({
        albums: response.data.albums,
        isLoadingAlbums: false,
      });
    }
  },

  createNewAlbum: async (params) => {
    const response = await createAlbum(params);

    if (response.error) {
      set({ error: response.error });
      return null;
    }

    if (response.data) {
      set((state) => ({
        albums: [...state.albums, response.data!.album],
      }));
      return response.data.album;
    }

    return null;
  },

  updateExistingAlbum: async (albumId, params) => {
    const response = await updateAlbum(albumId, params);

    if (response.error) {
      set({ error: response.error });
      return false;
    }

    if (response.data) {
      set((state) => ({
        albums: state.albums.map((album) => album.id === albumId ? response.data!.album : album),
      }));
      return true;
    }

    return false;
  },

  removeAlbum: async (albumId) => {
    const response = await deleteAlbum(albumId);

    if (response.error) {
      set({ error: response.error });
      return false;
    }

    set((state) => ({
      albums: state.albums.filter((album) => album.id !== albumId),
      selectedAlbumId: state.selectedAlbumId === albumId
        ? null
        : state.selectedAlbumId,
    }));

    return true;
  },

  setSelectedAlbum: (albumId) => {
    set({ selectedAlbumId: albumId, currentPage: 1, hasMoreImages: true });
    get().fetchImages();
  },

  addSelectedImagesToAlbum: async (albumId) => {
    const { selectedImageIds } = get();
    const imageIds = [...selectedImageIds];

    if (imageIds.length === 0) return false;

    const response = await addImagesToAlbum(albumId, imageIds);

    if (response.error) {
      set({ error: response.error });
      return false;
    }

    // Clear selection after successful add
    set({ selectedImageIds: new Set(), isSelectionMode: false });
    return true;
  },

  // ============================================================================
  // Selection Actions
  // ============================================================================

  toggleSelectionMode: () => {
    set((state) => ({
      isSelectionMode: !state.isSelectionMode,
      selectedImageIds: state.isSelectionMode
        ? new Set()
        : state.selectedImageIds,
    }));
  },

  toggleImageSelection: (imageId) => {
    set((state) => {
      const newSelection = new Set(state.selectedImageIds);
      if (newSelection.has(imageId)) {
        newSelection.delete(imageId);
      } else {
        newSelection.add(imageId);
      }
      return { selectedImageIds: newSelection };
    });
  },

  selectAllImages: () => {
    set((state) => ({
      selectedImageIds: new Set(state.images.map((img) => img.id)),
    }));
  },

  clearSelection: () => {
    set({ selectedImageIds: new Set() });
  },

  // ============================================================================
  // Batch Actions
  // ============================================================================

  batchEnhance: async (tier) => {
    const { selectedImageIds } = get();
    const imageIds = [...selectedImageIds];

    if (imageIds.length === 0) return false;

    const response = await batchEnhanceImages({ imageIds, tier });

    if (response.error) {
      set({ error: response.error });
      return false;
    }

    // Clear selection and exit selection mode after successful batch enhance
    set({ selectedImageIds: new Set(), isSelectionMode: false });
    return true;
  },

  batchDelete: async () => {
    const { selectedImageIds, removeImage } = get();
    const imageIds = [...selectedImageIds];

    if (imageIds.length === 0) return false;

    // Delete images one by one
    const results = await Promise.all(imageIds.map((id) => removeImage(id)));
    const allSuccessful = results.every((result) => result);

    if (allSuccessful) {
      set({ selectedImageIds: new Set(), isSelectionMode: false });
    }

    return allSuccessful;
  },

  // ============================================================================
  // Slideshow Actions
  // ============================================================================

  startSlideshow: (startIndex = 0) => {
    set({
      isSlideshowActive: true,
      slideshowIndex: startIndex,
    });
  },

  stopSlideshow: () => {
    set({
      isSlideshowActive: false,
      slideshowAutoAdvance: false,
    });
  },

  nextSlide: () => {
    set((state) => ({
      slideshowIndex: (state.slideshowIndex + 1) % state.images.length,
    }));
  },

  previousSlide: () => {
    set((state) => ({
      slideshowIndex: state.slideshowIndex === 0
        ? state.images.length - 1
        : state.slideshowIndex - 1,
    }));
  },

  goToSlide: (index) => {
    const { images } = get();
    if (index >= 0 && index < images.length) {
      set({ slideshowIndex: index });
    }
  },

  toggleAutoAdvance: () => {
    set((state) => ({
      slideshowAutoAdvance: !state.slideshowAutoAdvance,
    }));
  },

  setSlideshowInterval: (seconds) => {
    set({ slideshowInterval: Math.max(1, Math.min(60, seconds)) });
  },

  // ============================================================================
  // Utility Actions
  // ============================================================================

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));
