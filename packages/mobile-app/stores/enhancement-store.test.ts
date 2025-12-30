/**
 * Enhancement Store Tests
 */

import type { EnhancedImage, ImageEnhancementJob } from "@spike-npm-land/shared";
import { act, renderHook } from "@testing-library/react-native";
import { getImages } from "../services/api/images";
import { getJobStatus } from "../services/api/jobs";
import {
  selectCurrentJob,
  selectIsPolling,
  selectJobError,
  selectJobProgress,
  selectJobResultUrl,
  selectJobStatus,
  useEnhancementStore,
} from "./enhancement-store";

// Mock the API services
jest.mock("../services/api/images", () => ({
  getImages: jest.fn(),
}));

jest.mock("../services/api/jobs", () => ({
  getJobStatus: jest.fn(),
}));

const mockedGetImages = getImages as jest.MockedFunction<typeof getImages>;
const mockedGetJobStatus = getJobStatus as jest.MockedFunction<
  typeof getJobStatus
>;

// ============================================================================
// Test Data
// ============================================================================

const createMockImage = (
  overrides: Partial<EnhancedImage> = {},
): EnhancedImage => ({
  id: "image-123",
  userId: "user-456",
  name: "test-image.jpg",
  description: null,
  originalUrl: "https://example.com/original.jpg",
  originalWidth: 1920,
  originalHeight: 1080,
  originalSizeBytes: 1024000,
  originalFormat: "jpeg",
  isPublic: false,
  viewCount: 0,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  shareToken: null,
  ...overrides,
});

const createMockJob = (
  overrides: Partial<ImageEnhancementJob> = {},
): ImageEnhancementJob => ({
  id: "job-123",
  imageId: "image-456",
  userId: "user-789",
  tier: "TIER_2K",
  tokensCost: 5,
  status: "PENDING",
  currentStage: null,
  enhancedUrl: null,
  enhancedWidth: null,
  enhancedHeight: null,
  enhancedSizeBytes: null,
  errorMessage: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  processingStartedAt: null,
  processingCompletedAt: null,
  isBlend: false,
  isAnonymous: false,
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe("useEnhancementStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    const { result } = renderHook(() => useEnhancementStore());
    act(() => {
      result.current.clearCurrentEnhancement();
      // Clear images
      useEnhancementStore.setState({
        recentImages: [],
        isLoadingHistory: false,
        historyError: null,
        hasMoreHistory: true,
        currentPage: 1,
      });
    });
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useEnhancementStore());

      expect(result.current.recentImages).toEqual([]);
      expect(result.current.isLoadingHistory).toBe(false);
      expect(result.current.historyError).toBeNull();
      expect(result.current.hasMoreHistory).toBe(true);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.currentImageUri).toBeNull();
      expect(result.current.currentImageId).toBeNull();
      expect(result.current.selectedTier).toBeNull();
      expect(result.current.currentJobId).toBeNull();
      expect(result.current.currentJobStatus).toBeNull();
      expect(result.current.currentJob).toBeNull();
      expect(result.current.isPolling).toBe(false);
    });
  });

  describe("fetchRecentImages", () => {
    it("should fetch images successfully", async () => {
      const mockImages = [
        createMockImage({ id: "img-1" }),
        createMockImage({ id: "img-2" }),
      ];

      mockedGetImages.mockResolvedValue({
        data: {
          images: mockImages,
          total: 2,
          page: 1,
          limit: 20,
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementStore());

      await act(async () => {
        await result.current.fetchRecentImages();
      });

      expect(result.current.recentImages).toHaveLength(2);
      expect(result.current.isLoadingHistory).toBe(false);
      expect(result.current.historyError).toBeNull();
    });

    it("should handle fetch error", async () => {
      mockedGetImages.mockResolvedValue({
        data: null,
        error: "Network error",
        status: 500,
      });

      const { result } = renderHook(() => useEnhancementStore());

      await act(async () => {
        await result.current.fetchRecentImages();
      });

      expect(result.current.recentImages).toEqual([]);
      expect(result.current.historyError).toBe("Network error");
    });

    it("should refresh images when refresh is true", async () => {
      const mockImages = [createMockImage({ id: "img-1" })];

      mockedGetImages.mockResolvedValue({
        data: {
          images: mockImages,
          total: 1,
          page: 1,
          limit: 20,
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementStore());

      // Set initial state with some images
      act(() => {
        useEnhancementStore.setState({
          recentImages: [createMockImage({ id: "old-img" })],
          currentPage: 2,
        });
      });

      await act(async () => {
        await result.current.fetchRecentImages(true);
      });

      expect(result.current.recentImages).toHaveLength(1);
      expect(result.current.recentImages[0].id).toBe("img-1");
    });

    it("should not fetch if already loading", async () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        useEnhancementStore.setState({ isLoadingHistory: true });
      });

      await act(async () => {
        await result.current.fetchRecentImages();
      });

      expect(mockedGetImages).not.toHaveBeenCalled();
    });

    it("should set hasMoreHistory based on pagination", async () => {
      mockedGetImages.mockResolvedValue({
        data: {
          images: [createMockImage()],
          total: 50,
          page: 1,
          limit: 20,
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementStore());

      await act(async () => {
        await result.current.fetchRecentImages();
      });

      expect(result.current.hasMoreHistory).toBe(true);
    });

    it("should handle exception during fetch", async () => {
      mockedGetImages.mockRejectedValue(new Error("Unexpected error"));

      const { result } = renderHook(() => useEnhancementStore());

      await act(async () => {
        await result.current.fetchRecentImages();
      });

      expect(result.current.historyError).toBe("Unexpected error");
    });
  });

  describe("loadMoreImages", () => {
    it("should load more images", async () => {
      const mockImages = [createMockImage({ id: "img-new" })];

      mockedGetImages.mockResolvedValue({
        data: {
          images: mockImages,
          total: 40,
          page: 2,
          limit: 20,
        },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        useEnhancementStore.setState({
          recentImages: [createMockImage({ id: "img-old" })],
          hasMoreHistory: true,
          currentPage: 1,
        });
      });

      await act(async () => {
        await result.current.loadMoreImages();
      });

      expect(result.current.currentPage).toBe(2);
    });

    it("should not load more if no more history", async () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        useEnhancementStore.setState({ hasMoreHistory: false });
      });

      await act(async () => {
        await result.current.loadMoreImages();
      });

      expect(mockedGetImages).not.toHaveBeenCalled();
    });

    it("should not load more if already loading", async () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        useEnhancementStore.setState({ isLoadingHistory: true });
      });

      await act(async () => {
        await result.current.loadMoreImages();
      });

      expect(mockedGetImages).not.toHaveBeenCalled();
    });
  });

  describe("addRecentImage", () => {
    it("should add image to the beginning of the list", () => {
      const { result } = renderHook(() => useEnhancementStore());
      const newImage = createMockImage({ id: "new-img" });
      const existingImage = createMockImage({ id: "existing-img" });

      act(() => {
        useEnhancementStore.setState({ recentImages: [existingImage] });
      });

      act(() => {
        result.current.addRecentImage(newImage);
      });

      expect(result.current.recentImages[0].id).toBe("new-img");
      expect(result.current.recentImages).toHaveLength(2);
    });
  });

  describe("updateImage", () => {
    it("should update an existing image", () => {
      const { result } = renderHook(() => useEnhancementStore());
      const image = createMockImage({ id: "img-1", name: "old-name.jpg" });

      act(() => {
        useEnhancementStore.setState({ recentImages: [image] });
      });

      act(() => {
        result.current.updateImage("img-1", { name: "new-name.jpg" });
      });

      expect(result.current.recentImages[0].name).toBe("new-name.jpg");
    });

    it("should not affect other images", () => {
      const { result } = renderHook(() => useEnhancementStore());
      const image1 = createMockImage({ id: "img-1", name: "image1.jpg" });
      const image2 = createMockImage({ id: "img-2", name: "image2.jpg" });

      act(() => {
        useEnhancementStore.setState({ recentImages: [image1, image2] });
      });

      act(() => {
        result.current.updateImage("img-1", { name: "updated.jpg" });
      });

      expect(result.current.recentImages[1].name).toBe("image2.jpg");
    });
  });

  describe("removeImage", () => {
    it("should remove an image from the list", () => {
      const { result } = renderHook(() => useEnhancementStore());
      const image1 = createMockImage({ id: "img-1" });
      const image2 = createMockImage({ id: "img-2" });

      act(() => {
        useEnhancementStore.setState({ recentImages: [image1, image2] });
      });

      act(() => {
        result.current.removeImage("img-1");
      });

      expect(result.current.recentImages).toHaveLength(1);
      expect(result.current.recentImages[0].id).toBe("img-2");
    });
  });

  describe("setCurrentImage", () => {
    it("should set current image URI and ID", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.setCurrentImage("file://image.jpg", "img-123");
      });

      expect(result.current.currentImageUri).toBe("file://image.jpg");
      expect(result.current.currentImageId).toBe("img-123");
    });

    it("should set current image URI without ID", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.setCurrentImage("file://image.jpg");
      });

      expect(result.current.currentImageUri).toBe("file://image.jpg");
      expect(result.current.currentImageId).toBeNull();
    });

    it("should clear current image when null is passed", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.setCurrentImage("file://image.jpg", "img-123");
      });

      act(() => {
        result.current.setCurrentImage(null);
      });

      expect(result.current.currentImageUri).toBeNull();
      expect(result.current.currentImageId).toBeNull();
    });
  });

  describe("setSelectedTier", () => {
    it("should set selected tier", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.setSelectedTier("TIER_2K");
      });

      expect(result.current.selectedTier).toBe("TIER_2K");
    });

    it("should clear selected tier when null is passed", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.setSelectedTier("TIER_4K");
      });

      act(() => {
        result.current.setSelectedTier(null);
      });

      expect(result.current.selectedTier).toBeNull();
    });
  });

  describe("clearCurrentEnhancement", () => {
    it("should clear all current enhancement state", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.setCurrentImage("file://image.jpg", "img-123");
        result.current.setSelectedTier("TIER_2K");
        result.current.startJob("job-123");
      });

      act(() => {
        result.current.clearCurrentEnhancement();
      });

      expect(result.current.currentImageUri).toBeNull();
      expect(result.current.currentImageId).toBeNull();
      expect(result.current.selectedTier).toBeNull();
      expect(result.current.currentJobId).toBeNull();
      expect(result.current.currentJobStatus).toBeNull();
      expect(result.current.currentJob).toBeNull();
      expect(result.current.isPolling).toBe(false);
    });
  });

  describe("setCurrentJobId (legacy)", () => {
    it("should set current job ID and status to QUEUED", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.setCurrentJobId("job-123");
      });

      expect(result.current.currentJobId).toBe("job-123");
      expect(result.current.currentJobStatus).toBe("QUEUED");
    });

    it("should clear job status when null is passed", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.setCurrentJobId("job-123");
      });

      act(() => {
        result.current.setCurrentJobId(null);
      });

      expect(result.current.currentJobId).toBeNull();
      expect(result.current.currentJobStatus).toBeNull();
    });
  });

  describe("checkJobStatus", () => {
    it("should fetch and update job status", async () => {
      const mockJob = createMockJob({ id: "job-123", status: "PROCESSING" });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: mockJob },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementStore());

      let status: string | null = null;
      await act(async () => {
        status = await result.current.checkJobStatus("job-123");
      });

      expect(status).toBe("PROCESSING");
      expect(result.current.currentJobStatus).toBe("PROCESSING");
    });

    it("should return null on API error", async () => {
      mockedGetJobStatus.mockResolvedValue({
        data: null,
        error: "Job not found",
        status: 404,
      });

      const { result } = renderHook(() => useEnhancementStore());

      let status: string | null = "initial";
      await act(async () => {
        status = await result.current.checkJobStatus("invalid-job");
      });

      expect(status).toBeNull();
    });

    it("should update currentJob if active", async () => {
      const mockJob = createMockJob({
        id: "job-123",
        status: "PROCESSING",
        currentStage: "GENERATING",
      });

      mockedGetJobStatus.mockResolvedValue({
        data: { job: mockJob },
        error: null,
        status: 200,
      });

      const { result } = renderHook(() => useEnhancementStore());

      // Start a job first
      act(() => {
        result.current.startJob("job-123");
      });

      await act(async () => {
        await result.current.checkJobStatus("job-123");
      });

      expect(result.current.currentJob?.status).toBe("PROCESSING");
      expect(result.current.currentJob?.stage).toBe("GENERATING");
    });
  });

  describe("startJob", () => {
    it("should initialize job tracking state", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.startJob("job-456");
      });

      expect(result.current.currentJobId).toBe("job-456");
      expect(result.current.currentJobStatus).toBe("PENDING");
      expect(result.current.currentJob).not.toBeNull();
      expect(result.current.currentJob?.id).toBe("job-456");
      expect(result.current.currentJob?.status).toBe("PENDING");
      expect(result.current.currentJob?.progress).toBe(0);
      expect(result.current.currentJob?.statusMessage).toBe(
        "Starting enhancement...",
      );
      expect(result.current.isPolling).toBe(true);
    });
  });

  describe("updateJobStatus", () => {
    it("should update job status", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.startJob("job-123");
      });

      act(() => {
        result.current.updateJobStatus({
          status: "PROCESSING",
          stage: "ANALYZING",
          progress: 25,
          statusMessage: "Analyzing image...",
        });
      });

      expect(result.current.currentJob?.status).toBe("PROCESSING");
      expect(result.current.currentJob?.stage).toBe("ANALYZING");
      expect(result.current.currentJob?.progress).toBe(25);
      expect(result.current.currentJobStatus).toBe("PROCESSING");
    });

    it("should not update if no current job", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.updateJobStatus({
          status: "PROCESSING",
        });
      });

      expect(result.current.currentJob).toBeNull();
    });

    it("should preserve existing values when updating", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.startJob("job-123");
      });

      act(() => {
        result.current.updateJobStatus({ progress: 50 });
      });

      expect(result.current.currentJob?.id).toBe("job-123");
      expect(result.current.currentJob?.status).toBe("PENDING");
      expect(result.current.currentJob?.progress).toBe(50);
    });
  });

  describe("completeJob", () => {
    it("should complete job successfully", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.startJob("job-123");
      });

      act(() => {
        result.current.completeJob("https://example.com/enhanced.jpg");
      });

      expect(result.current.currentJob?.status).toBe("COMPLETED");
      expect(result.current.currentJob?.progress).toBe(100);
      expect(result.current.currentJob?.resultUrl).toBe(
        "https://example.com/enhanced.jpg",
      );
      expect(result.current.currentJob?.error).toBeNull();
      expect(result.current.currentJob?.completedAt).not.toBeNull();
      expect(result.current.isPolling).toBe(false);
    });

    it("should complete job with error", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.startJob("job-123");
      });

      act(() => {
        result.current.completeJob(null, "Enhancement failed");
      });

      expect(result.current.currentJob?.status).toBe("FAILED");
      expect(result.current.currentJob?.progress).toBe(0);
      expect(result.current.currentJob?.error).toBe("Enhancement failed");
      expect(result.current.currentJob?.resultUrl).toBeNull();
      expect(result.current.isPolling).toBe(false);
    });

    it("should not update if no current job", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.completeJob("https://example.com/enhanced.jpg");
      });

      expect(result.current.currentJob).toBeNull();
    });
  });

  describe("setPolling", () => {
    it("should set polling state", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.setPolling(true);
      });

      expect(result.current.isPolling).toBe(true);

      act(() => {
        result.current.setPolling(false);
      });

      expect(result.current.isPolling).toBe(false);
    });
  });

  describe("selectors", () => {
    it("selectCurrentJob should return current job", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.startJob("job-123");
      });

      const state = useEnhancementStore.getState();
      const job = selectCurrentJob(state);

      expect(job?.id).toBe("job-123");
    });

    it("selectIsPolling should return polling state", () => {
      const { result } = renderHook(() => useEnhancementStore());

      act(() => {
        result.current.setPolling(true);
      });

      const state = useEnhancementStore.getState();
      expect(selectIsPolling(state)).toBe(true);
    });

    it("selectJobProgress should return progress or 0", () => {
      const { result } = renderHook(() => useEnhancementStore());

      const stateWithoutJob = useEnhancementStore.getState();
      expect(selectJobProgress(stateWithoutJob)).toBe(0);

      act(() => {
        result.current.startJob("job-123");
        result.current.updateJobStatus({ progress: 50 });
      });

      const stateWithJob = useEnhancementStore.getState();
      expect(selectJobProgress(stateWithJob)).toBe(50);
    });

    it("selectJobStatus should return status or null", () => {
      const stateWithoutJob = useEnhancementStore.getState();
      expect(selectJobStatus(stateWithoutJob)).toBeNull();
    });

    it("selectJobError should return error or null", () => {
      const stateWithoutJob = useEnhancementStore.getState();
      expect(selectJobError(stateWithoutJob)).toBeNull();
    });

    it("selectJobResultUrl should return result URL or null", () => {
      const stateWithoutJob = useEnhancementStore.getState();
      expect(selectJobResultUrl(stateWithoutJob)).toBeNull();
    });
  });
});
