/**
 * Gallery Store Tests
 */

import { act } from "@testing-library/react-native";

import * as imagesApi from "../services/api/images";
import {
  type DateRange,
  type ImageFilters,
  type SortOption,
  useGalleryStore,
} from "./gallery-store";

// ============================================================================
// Mocks
// ============================================================================

jest.mock("../services/api/images", () => ({
  getImages: jest.fn(),
  getAlbums: jest.fn(),
  deleteImage: jest.fn(),
  createAlbum: jest.fn(),
  updateAlbum: jest.fn(),
  deleteAlbum: jest.fn(),
  addImagesToAlbum: jest.fn(),
  batchEnhanceImages: jest.fn(),
}));

const mockGetImages = imagesApi.getImages as jest.MockedFunction<typeof imagesApi.getImages>;
const mockGetAlbums = imagesApi.getAlbums as jest.MockedFunction<typeof imagesApi.getAlbums>;
const mockDeleteImage = imagesApi.deleteImage as jest.MockedFunction<typeof imagesApi.deleteImage>;

// ============================================================================
// Test Data
// ============================================================================

const mockImages = [
  {
    id: "img-1",
    userId: "user-1",
    originalUrl: "https://example.com/img1.jpg",
    enhancedUrl: null,
    thumbnailUrl: "https://example.com/img1-thumb.jpg",
    status: "PENDING" as const,
    currentTier: null,
    width: 1920,
    height: 1080,
    sizeBytes: 1024000,
    mimeType: "image/jpeg",
    originalName: "photo1.jpg",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "img-2",
    userId: "user-1",
    originalUrl: "https://example.com/img2.jpg",
    enhancedUrl: "https://example.com/img2-enhanced.jpg",
    thumbnailUrl: "https://example.com/img2-thumb.jpg",
    status: "COMPLETED" as const,
    currentTier: "TIER_2K" as const,
    width: 2048,
    height: 1536,
    sizeBytes: 2048000,
    mimeType: "image/jpeg",
    originalName: "photo2.jpg",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
];

const mockAlbums = [
  {
    id: "album-1",
    name: "Vacation",
    description: "Summer 2024",
    userId: "user-1",
    imageCount: 10,
    privacy: "PRIVATE" as const,
    defaultTier: "TIER_1K" as const,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

// ============================================================================
// Test Setup
// ============================================================================

describe("Gallery Store", () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useGalleryStore.getState().reset();
    });
    jest.clearAllMocks();
  });

  describe("Initial State", () => {
    it("has correct initial state", () => {
      const state = useGalleryStore.getState();

      expect(state.images).toEqual([]);
      expect(state.totalImages).toBe(0);
      expect(state.currentPage).toBe(1);
      expect(state.isLoadingImages).toBe(false);
      expect(state.hasMoreImages).toBe(true);
      expect(state.searchQuery).toBe("");
      expect(state.filters).toEqual({
        albumIds: [],
        dateRange: {
          startDate: null,
          endDate: null,
        },
      });
      expect(state.sortBy).toBe("newest");
      expect(state.albums).toEqual([]);
      expect(state.isLoadingAlbums).toBe(false);
      expect(state.selectedAlbumId).toBeNull();
      expect(state.isSelectionMode).toBe(false);
      expect(state.selectedImageIds).toEqual(new Set());
      expect(state.error).toBeNull();
    });
  });

  describe("Search Actions", () => {
    describe("setSearchQuery", () => {
      it("updates search query and fetches images", async () => {
        mockGetImages.mockResolvedValueOnce({
          data: { images: mockImages, total: 2, page: 1, limit: 20 },
          error: null,
        });

        await act(async () => {
          useGalleryStore.getState().setSearchQuery("sunset");
        });

        const state = useGalleryStore.getState();
        expect(state.searchQuery).toBe("sunset");
        expect(mockGetImages).toHaveBeenCalledWith(
          expect.objectContaining({
            search: "sunset",
            page: 1,
          }),
        );
      });

      it("resets pagination when query changes", async () => {
        mockGetImages.mockResolvedValue({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        // Set initial page
        act(() => {
          useGalleryStore.setState({ currentPage: 3 });
        });

        await act(async () => {
          useGalleryStore.getState().setSearchQuery("new query");
        });

        const state = useGalleryStore.getState();
        expect(state.currentPage).toBe(1);
        expect(state.hasMoreImages).toBe(false);
      });

      it("trims whitespace from query", async () => {
        mockGetImages.mockResolvedValueOnce({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        await act(async () => {
          useGalleryStore.getState().setSearchQuery("  test  ");
        });

        expect(mockGetImages).toHaveBeenCalledWith(
          expect.objectContaining({
            search: "test",
          }),
        );
      });

      it("sends undefined for empty query", async () => {
        mockGetImages.mockResolvedValueOnce({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        await act(async () => {
          useGalleryStore.getState().setSearchQuery("   ");
        });

        expect(mockGetImages).toHaveBeenCalledWith(
          expect.objectContaining({
            search: undefined,
          }),
        );
      });
    });

    describe("setFilters", () => {
      it("updates album filter and fetches images", async () => {
        mockGetImages.mockResolvedValueOnce({
          data: { images: mockImages, total: 2, page: 1, limit: 20 },
          error: null,
        });

        await act(async () => {
          useGalleryStore.getState().setFilters({ albumIds: ["album-1"] });
        });

        const state = useGalleryStore.getState();
        expect(state.filters.albumIds).toEqual(["album-1"]);
        expect(mockGetImages).toHaveBeenCalledWith(
          expect.objectContaining({
            albumId: "album-1",
          }),
        );
      });

      it("updates date range filter and fetches images", async () => {
        mockGetImages.mockResolvedValueOnce({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        const startDate = new Date("2024-06-01");
        const endDate = new Date("2024-12-31");

        await act(async () => {
          useGalleryStore.getState().setFilters({
            dateRange: { startDate, endDate },
          });
        });

        const state = useGalleryStore.getState();
        expect(state.filters.dateRange.startDate).toEqual(startDate);
        expect(state.filters.dateRange.endDate).toEqual(endDate);
        expect(mockGetImages).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: "2024-06-01",
            endDate: "2024-12-31",
          }),
        );
      });

      it("merges partial filter updates", async () => {
        mockGetImages.mockResolvedValue({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        // Set album filter first
        await act(async () => {
          useGalleryStore.getState().setFilters({ albumIds: ["album-1"] });
        });

        // Then set date range - should preserve album filter
        await act(async () => {
          useGalleryStore.getState().setFilters({
            dateRange: { startDate: new Date("2024-01-01"), endDate: null },
          });
        });

        const state = useGalleryStore.getState();
        expect(state.filters.albumIds).toEqual(["album-1"]);
        expect(state.filters.dateRange.startDate).toEqual(new Date("2024-01-01"));
      });

      it("resets pagination when filters change", async () => {
        mockGetImages.mockResolvedValue({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        act(() => {
          useGalleryStore.setState({ currentPage: 5 });
        });

        await act(async () => {
          useGalleryStore.getState().setFilters({ albumIds: ["album-1"] });
        });

        const state = useGalleryStore.getState();
        expect(state.currentPage).toBe(1);
      });
    });

    describe("resetFilters", () => {
      it("resets filters to defaults and fetches images", async () => {
        mockGetImages.mockResolvedValue({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        // Set some filters first
        act(() => {
          useGalleryStore.setState({
            filters: {
              albumIds: ["album-1", "album-2"],
              dateRange: {
                startDate: new Date("2024-01-01"),
                endDate: new Date("2024-12-31"),
              },
            },
          });
        });

        await act(async () => {
          useGalleryStore.getState().resetFilters();
        });

        const state = useGalleryStore.getState();
        expect(state.filters).toEqual({
          albumIds: [],
          dateRange: {
            startDate: null,
            endDate: null,
          },
        });
        expect(mockGetImages).toHaveBeenCalled();
      });
    });

    describe("setSortBy", () => {
      it("updates sort option and fetches images", async () => {
        mockGetImages.mockResolvedValueOnce({
          data: { images: mockImages, total: 2, page: 1, limit: 20 },
          error: null,
        });

        await act(async () => {
          useGalleryStore.getState().setSortBy("oldest");
        });

        const state = useGalleryStore.getState();
        expect(state.sortBy).toBe("oldest");
        expect(mockGetImages).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: "createdAt",
            sortOrder: "asc",
          }),
        );
      });

      it("converts name_asc to correct API params", async () => {
        mockGetImages.mockResolvedValueOnce({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        await act(async () => {
          useGalleryStore.getState().setSortBy("name_asc");
        });

        expect(mockGetImages).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: "name",
            sortOrder: "asc",
          }),
        );
      });

      it("converts name_desc to correct API params", async () => {
        mockGetImages.mockResolvedValueOnce({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        await act(async () => {
          useGalleryStore.getState().setSortBy("name_desc");
        });

        expect(mockGetImages).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: "name",
            sortOrder: "desc",
          }),
        );
      });

      it("converts size_asc to correct API params", async () => {
        mockGetImages.mockResolvedValueOnce({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        await act(async () => {
          useGalleryStore.getState().setSortBy("size_asc");
        });

        expect(mockGetImages).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: "size",
            sortOrder: "asc",
          }),
        );
      });

      it("converts size_desc to correct API params", async () => {
        mockGetImages.mockResolvedValueOnce({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        await act(async () => {
          useGalleryStore.getState().setSortBy("size_desc");
        });

        expect(mockGetImages).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: "size",
            sortOrder: "desc",
          }),
        );
      });

      it("resets pagination when sort changes", async () => {
        mockGetImages.mockResolvedValue({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        act(() => {
          useGalleryStore.setState({ currentPage: 3 });
        });

        await act(async () => {
          useGalleryStore.getState().setSortBy("name_asc");
        });

        const state = useGalleryStore.getState();
        expect(state.currentPage).toBe(1);
      });
    });

    describe("clearSearch", () => {
      it("clears search query, filters, and sort", async () => {
        mockGetImages.mockResolvedValue({
          data: { images: [], total: 0, page: 1, limit: 20 },
          error: null,
        });

        // Set various search state
        act(() => {
          useGalleryStore.setState({
            searchQuery: "test",
            filters: {
              albumIds: ["album-1"],
              dateRange: {
                startDate: new Date(),
                endDate: new Date(),
              },
            },
            sortBy: "name_desc",
          });
        });

        await act(async () => {
          useGalleryStore.getState().clearSearch();
        });

        const state = useGalleryStore.getState();
        expect(state.searchQuery).toBe("");
        expect(state.filters).toEqual({
          albumIds: [],
          dateRange: {
            startDate: null,
            endDate: null,
          },
        });
        expect(state.sortBy).toBe("newest");
      });

      it("resets pagination and fetches images", async () => {
        mockGetImages.mockResolvedValue({
          data: { images: mockImages, total: 2, page: 1, limit: 20 },
          error: null,
        });

        act(() => {
          useGalleryStore.setState({ currentPage: 5 });
        });

        await act(async () => {
          useGalleryStore.getState().clearSearch();
        });

        const state = useGalleryStore.getState();
        expect(state.currentPage).toBe(1);
        expect(mockGetImages).toHaveBeenCalled();
      });
    });
  });

  describe("fetchImages with search params", () => {
    it("includes all search params in API call", async () => {
      mockGetImages.mockResolvedValueOnce({
        data: { images: mockImages, total: 2, page: 1, limit: 20 },
        error: null,
      });

      const startDate = new Date("2024-06-01");
      const endDate = new Date("2024-12-31");

      act(() => {
        useGalleryStore.setState({
          searchQuery: "sunset",
          filters: {
            albumIds: ["album-1"],
            dateRange: { startDate, endDate },
          },
          sortBy: "oldest",
        });
      });

      await act(async () => {
        await useGalleryStore.getState().fetchImages();
      });

      expect(mockGetImages).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "sunset",
          albumId: "album-1",
          sortBy: "createdAt",
          sortOrder: "asc",
          startDate: "2024-06-01",
          endDate: "2024-12-31",
        }),
      );
    });

    it("uses filter albumId over selectedAlbumId", async () => {
      mockGetImages.mockResolvedValueOnce({
        data: { images: [], total: 0, page: 1, limit: 20 },
        error: null,
      });

      act(() => {
        useGalleryStore.setState({
          selectedAlbumId: "old-album",
          filters: {
            albumIds: ["filter-album"],
            dateRange: { startDate: null, endDate: null },
          },
        });
      });

      await act(async () => {
        await useGalleryStore.getState().fetchImages();
      });

      expect(mockGetImages).toHaveBeenCalledWith(
        expect.objectContaining({
          albumId: "filter-album",
        }),
      );
    });

    it("falls back to selectedAlbumId when no filter albums", async () => {
      mockGetImages.mockResolvedValueOnce({
        data: { images: [], total: 0, page: 1, limit: 20 },
        error: null,
      });

      act(() => {
        useGalleryStore.setState({
          selectedAlbumId: "selected-album",
          filters: {
            albumIds: [],
            dateRange: { startDate: null, endDate: null },
          },
        });
      });

      await act(async () => {
        await useGalleryStore.getState().fetchImages();
      });

      expect(mockGetImages).toHaveBeenCalledWith(
        expect.objectContaining({
          albumId: "selected-album",
        }),
      );
    });
  });

  describe("fetchMoreImages with search params", () => {
    it("includes search params when loading more", async () => {
      mockGetImages.mockResolvedValue({
        data: { images: mockImages, total: 40, page: 2, limit: 20 },
        error: null,
      });

      act(() => {
        useGalleryStore.setState({
          images: mockImages,
          currentPage: 1,
          hasMoreImages: true,
          searchQuery: "beach",
          sortBy: "name_asc",
        });
      });

      await act(async () => {
        await useGalleryStore.getState().fetchMoreImages();
      });

      expect(mockGetImages).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          search: "beach",
          sortBy: "name",
          sortOrder: "asc",
        }),
      );
    });

    it("appends images to existing list", async () => {
      const moreImages = [
        { ...mockImages[0], id: "img-3" },
        { ...mockImages[1], id: "img-4" },
      ];

      mockGetImages.mockResolvedValueOnce({
        data: { images: moreImages, total: 4, page: 2, limit: 20 },
        error: null,
      });

      act(() => {
        useGalleryStore.setState({
          images: mockImages,
          currentPage: 1,
          hasMoreImages: true,
        });
      });

      await act(async () => {
        await useGalleryStore.getState().fetchMoreImages();
      });

      const state = useGalleryStore.getState();
      expect(state.images.length).toBe(4);
      expect(state.images.map((img) => img.id)).toEqual([
        "img-1",
        "img-2",
        "img-3",
        "img-4",
      ]);
    });
  });

  describe("Error Handling", () => {
    it("sets error on fetchImages failure", async () => {
      mockGetImages.mockResolvedValueOnce({
        data: null,
        error: "Failed to fetch images",
      });

      await act(async () => {
        await useGalleryStore.getState().fetchImages();
      });

      const state = useGalleryStore.getState();
      expect(state.error).toBe("Failed to fetch images");
      expect(state.isLoadingImages).toBe(false);
    });

    it("sets error on fetchMoreImages failure", async () => {
      mockGetImages.mockResolvedValueOnce({
        data: null,
        error: "Network error",
      });

      act(() => {
        useGalleryStore.setState({
          images: mockImages,
          hasMoreImages: true,
        });
      });

      await act(async () => {
        await useGalleryStore.getState().fetchMoreImages();
      });

      const state = useGalleryStore.getState();
      expect(state.error).toBe("Network error");
    });

    it("clears error", () => {
      act(() => {
        useGalleryStore.setState({ error: "Some error" });
      });

      act(() => {
        useGalleryStore.getState().clearError();
      });

      expect(useGalleryStore.getState().error).toBeNull();
    });
  });

  describe("reset", () => {
    it("resets all state including search params", async () => {
      // Set various state
      act(() => {
        useGalleryStore.setState({
          images: mockImages,
          searchQuery: "test",
          filters: {
            albumIds: ["album-1"],
            dateRange: { startDate: new Date(), endDate: new Date() },
          },
          sortBy: "name_asc",
          selectedAlbumId: "album-2",
          isSelectionMode: true,
          error: "Some error",
        });
      });

      act(() => {
        useGalleryStore.getState().reset();
      });

      const state = useGalleryStore.getState();
      expect(state.images).toEqual([]);
      expect(state.searchQuery).toBe("");
      expect(state.filters).toEqual({
        albumIds: [],
        dateRange: { startDate: null, endDate: null },
      });
      expect(state.sortBy).toBe("newest");
      expect(state.selectedAlbumId).toBeNull();
      expect(state.isSelectionMode).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
