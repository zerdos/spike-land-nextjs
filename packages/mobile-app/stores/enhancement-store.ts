/**
 * Enhancement Store
 * Manages enhancement history and current enhancement state with Zustand
 */

import type { EnhancedImage, EnhancementTier, ImageEnhancementJob } from "@spike-npm-land/shared";
import { create } from "zustand";
import { getImages, ImagesListResponse } from "../services/api/images";

// ============================================================================
// Types
// ============================================================================

export interface EnhancementHistoryItem {
  id: string;
  image: EnhancedImage;
  latestJob: ImageEnhancementJob | null;
  createdAt: Date;
}

interface EnhancementState {
  // Recent enhancements/images
  recentImages: EnhancedImage[];
  isLoadingHistory: boolean;
  historyError: string | null;
  hasMoreHistory: boolean;
  currentPage: number;

  // Currently selected image for enhancement
  currentImageUri: string | null;
  currentImageId: string | null;
  selectedTier: EnhancementTier | null;
}

interface EnhancementActions {
  // History management
  fetchRecentImages: (refresh?: boolean) => Promise<void>;
  loadMoreImages: () => Promise<void>;
  addRecentImage: (image: EnhancedImage) => void;
  updateImage: (imageId: string, updates: Partial<EnhancedImage>) => void;
  removeImage: (imageId: string) => void;

  // Current enhancement flow
  setCurrentImage: (uri: string | null, id?: string | null) => void;
  setSelectedTier: (tier: EnhancementTier | null) => void;
  clearCurrentEnhancement: () => void;
}

type EnhancementStore = EnhancementState & EnhancementActions;

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 20;

// ============================================================================
// Store Implementation
// ============================================================================

export const useEnhancementStore = create<EnhancementStore>((set, get) => ({
  // Initial state
  recentImages: [],
  isLoadingHistory: false,
  historyError: null,
  hasMoreHistory: true,
  currentPage: 1,

  currentImageUri: null,
  currentImageId: null,
  selectedTier: null,

  // Actions
  fetchRecentImages: async (refresh = false) => {
    const state = get();

    // Don't fetch if already loading
    if (state.isLoadingHistory && !refresh) return;

    set({
      isLoadingHistory: true,
      historyError: null,
      ...(refresh ? { currentPage: 1, hasMoreHistory: true } : {}),
    });

    try {
      const response = await getImages({
        page: refresh ? 1 : state.currentPage,
        limit: PAGE_SIZE,
      });

      if (response.error || !response.data) {
        set({
          isLoadingHistory: false,
          historyError: response.error || "Failed to fetch images",
        });
        return;
      }

      const { images, total, page, limit } = response.data;
      const hasMore = page * limit < total;

      set((prevState) => ({
        recentImages: refresh ? images : [...prevState.recentImages, ...images],
        isLoadingHistory: false,
        hasMoreHistory: hasMore,
        currentPage: page,
      }));
    } catch (error) {
      set({
        isLoadingHistory: false,
        historyError: error instanceof Error ? error.message : "Failed to fetch images",
      });
    }
  },

  loadMoreImages: async () => {
    const state = get();

    if (state.isLoadingHistory || !state.hasMoreHistory) return;

    set({ currentPage: state.currentPage + 1 });
    await get().fetchRecentImages();
  },

  addRecentImage: (image) => {
    set((state) => ({
      recentImages: [image, ...state.recentImages],
    }));
  },

  updateImage: (imageId, updates) => {
    set((state) => ({
      recentImages: state.recentImages.map((img) =>
        img.id === imageId ? { ...img, ...updates } : img
      ),
    }));
  },

  removeImage: (imageId) => {
    set((state) => ({
      recentImages: state.recentImages.filter((img) => img.id !== imageId),
    }));
  },

  setCurrentImage: (uri, id = null) => {
    set({
      currentImageUri: uri,
      currentImageId: id,
    });
  },

  setSelectedTier: (tier) => {
    set({ selectedTier: tier });
  },

  clearCurrentEnhancement: () => {
    set({
      currentImageUri: null,
      currentImageId: null,
      selectedTier: null,
    });
  },
}));

export default useEnhancementStore;
