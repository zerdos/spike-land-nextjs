/**
 * Enhancement Store
 * Manages enhancement history and current enhancement state with Zustand
 */

import type {
  EnhancedImage,
  EnhancementTier,
  JobStatus,
  PipelineStage,
} from "@spike-npm-land/shared";
import { create } from "zustand";
import { getImages } from "../services/api/images";
import { getJobStatus } from "../services/api/jobs";

// ============================================================================
// Types
// ============================================================================

interface CurrentJobState {
  id: string;
  status: JobStatus;
  stage: PipelineStage | null;
  progress: number;
  statusMessage: string;
  error: string | null;
  resultUrl: string | null;
  startedAt: Date;
  completedAt: Date | null;
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

  // Current job tracking (legacy)
  currentJobId: string | null;
  currentJobStatus: string | null;

  // Enhanced job tracking
  currentJob: CurrentJobState | null;
  isPolling: boolean;
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

  // Job tracking (legacy)
  setCurrentJobId: (jobId: string | null) => void;
  checkJobStatus: (jobId: string) => Promise<string | null>;

  // Enhanced job tracking
  startJob: (jobId: string) => void;
  updateJobStatus: (updates: Partial<CurrentJobState>) => void;
  completeJob: (resultUrl: string | null, error?: string | null) => void;
  setPolling: (isPolling: boolean) => void;
}

type EnhancementStore = EnhancementState & EnhancementActions;

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentJob = (state: EnhancementStore) => state.currentJob;
export const selectIsPolling = (state: EnhancementStore) => state.isPolling;
export const selectJobProgress = (state: EnhancementStore) => state.currentJob?.progress ?? 0;
export const selectJobStatus = (state: EnhancementStore) => state.currentJob?.status ?? null;
export const selectJobError = (state: EnhancementStore) => state.currentJob?.error ?? null;
export const selectJobResultUrl = (state: EnhancementStore) => state.currentJob?.resultUrl ?? null;

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

  currentJobId: null,
  currentJobStatus: null,

  // Enhanced job tracking
  currentJob: null,
  isPolling: false,

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
        historyError: error instanceof Error
          ? error.message
          : "Failed to fetch images",
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
      currentJobId: null,
      currentJobStatus: null,
      currentJob: null,
      isPolling: false,
    });
  },

  setCurrentJobId: (jobId) => {
    set({ currentJobId: jobId, currentJobStatus: jobId ? "QUEUED" : null });
  },

  checkJobStatus: async (jobId) => {
    const response = await getJobStatus(jobId);

    if (response.error || !response.data?.job) {
      return null;
    }

    const job = response.data.job;
    set({ currentJobStatus: job.status });

    // Update enhanced job tracking if active
    const currentJob = get().currentJob;
    if (currentJob && currentJob.id === jobId) {
      set({
        currentJob: {
          ...currentJob,
          status: job.status,
          stage: job.currentStage,
        },
      });
    }

    return job.status;
  },

  // Enhanced job tracking actions
  startJob: (jobId) => {
    set({
      currentJobId: jobId,
      currentJobStatus: "PENDING",
      currentJob: {
        id: jobId,
        status: "PENDING",
        stage: null,
        progress: 0,
        statusMessage: "Starting enhancement...",
        error: null,
        resultUrl: null,
        startedAt: new Date(),
        completedAt: null,
      },
      isPolling: true,
    });
  },

  updateJobStatus: (updates) => {
    const currentJob = get().currentJob;
    if (!currentJob) return;

    set({
      currentJob: {
        ...currentJob,
        ...updates,
      },
      currentJobStatus: updates.status ?? currentJob.status,
    });
  },

  completeJob: (resultUrl, error = null) => {
    const currentJob = get().currentJob;
    if (!currentJob) return;

    const isError = error !== null;
    set({
      currentJob: {
        ...currentJob,
        status: isError ? "FAILED" : "COMPLETED",
        progress: isError ? 0 : 100,
        statusMessage: isError ? "Enhancement failed" : "Enhancement complete!",
        error,
        resultUrl,
        completedAt: new Date(),
      },
      currentJobStatus: isError ? "FAILED" : "COMPLETED",
      isPolling: false,
    });
  },

  setPolling: (isPolling) => {
    set({ isPolling });
  },
}));
