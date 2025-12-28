/**
 * Images API Service Tests
 * Tests for image upload, enhancement, gallery, and sharing operations
 */

import { apiClient } from "../api-client";
import {
  addImagesToAlbum,
  batchEnhanceImages,
  createAlbum,
  deleteAlbum,
  deleteImage,
  enhanceImage,
  getAlbums,
  getDownloadUrl,
  getImage,
  getImages,
  getShareLink,
  shareImage,
  updateAlbum,
  uploadImage,
} from "./images";

// Mock the API client
jest.mock("../api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    uploadFile: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("Images API Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Upload and Enhancement Tests
  // ==========================================================================

  describe("uploadImage", () => {
    it("should upload an image with default tier", async () => {
      const mockResponse = {
        data: {
          image: { id: "img-123", originalUrl: "https://example.com/image.jpg" },
        },
        error: null,
        status: 200,
      };
      mockApiClient.uploadFile.mockResolvedValue(mockResponse);

      const file = { uri: "file://test.jpg", name: "test.jpg", type: "image/jpeg" };
      const result = await uploadImage(file);

      expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
        "/api/images/upload",
        file,
        { tier: "TIER_1K" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should upload an image with specified tier", async () => {
      const mockResponse = {
        data: {
          image: { id: "img-123", originalUrl: "https://example.com/image.jpg" },
        },
        error: null,
        status: 200,
      };
      mockApiClient.uploadFile.mockResolvedValue(mockResponse);

      const file = { uri: "file://test.jpg", name: "test.jpg", type: "image/jpeg" };
      const result = await uploadImage(file, "TIER_4K");

      expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
        "/api/images/upload",
        file,
        { tier: "TIER_4K" },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("enhanceImage", () => {
    it("should enhance an image", async () => {
      const mockResponse = {
        data: { job: { id: "job-123", status: "PENDING" } },
        error: null,
        status: 200,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const params = { imageId: "img-123", tier: "TIER_2K" as const };
      const result = await enhanceImage(params);

      expect(mockApiClient.post).toHaveBeenCalledWith("/api/images/enhance", params);
      expect(result).toEqual(mockResponse);
    });

    it("should enhance with optional prompt and pipelineId", async () => {
      const mockResponse = {
        data: { job: { id: "job-123", status: "PENDING" } },
        error: null,
        status: 200,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const params = {
        imageId: "img-123",
        tier: "TIER_4K" as const,
        prompt: "Make it brighter",
        pipelineId: "pipeline-456",
      };
      const result = await enhanceImage(params);

      expect(mockApiClient.post).toHaveBeenCalledWith("/api/images/enhance", params);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("batchEnhanceImages", () => {
    it("should batch enhance multiple images", async () => {
      const mockResponse = {
        data: {
          jobs: [
            { id: "job-1", status: "PENDING" },
            { id: "job-2", status: "PENDING" },
          ],
        },
        error: null,
        status: 200,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const params = { imageIds: ["img-1", "img-2"], tier: "TIER_1K" as const };
      const result = await batchEnhanceImages(params);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/api/images/batch-enhance",
        params,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  // ==========================================================================
  // Image CRUD Tests
  // ==========================================================================

  describe("getImages", () => {
    it("should get images without params", async () => {
      const mockResponse = {
        data: { images: [], total: 0, page: 1, limit: 20 },
        error: null,
        status: 200,
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getImages();

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/images");
      expect(result).toEqual(mockResponse);
    });

    it("should get images with all params", async () => {
      const mockResponse = {
        data: { images: [], total: 0, page: 2, limit: 10 },
        error: null,
        status: 200,
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getImages({ page: 2, limit: 10, albumId: "album-123" });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        "/api/images?page=2&limit=10&albumId=album-123",
      );
      expect(result).toEqual(mockResponse);
    });

    it("should get images with partial params", async () => {
      const mockResponse = {
        data: { images: [], total: 0, page: 1, limit: 20 },
        error: null,
        status: 200,
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getImages({ albumId: "album-123" });

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/images?albumId=album-123");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getImage", () => {
    it("should get a single image by ID", async () => {
      const mockResponse = {
        data: { image: { id: "img-123", originalUrl: "https://example.com/img.jpg" } },
        error: null,
        status: 200,
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getImage("img-123");

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/images/img-123");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("deleteImage", () => {
    it("should delete an image", async () => {
      const mockResponse = {
        data: { success: true },
        error: null,
        status: 200,
      };
      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await deleteImage("img-123");

      expect(mockApiClient.delete).toHaveBeenCalledWith("/api/images/img-123");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("shareImage", () => {
    it("should create a share link for an image", async () => {
      const mockResponse = {
        data: { shareToken: "token-123", shareUrl: "https://spike.land/share/token-123" },
        error: null,
        status: 200,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await shareImage("img-123");

      expect(mockApiClient.post).toHaveBeenCalledWith("/api/images/img-123/share");
      expect(result).toEqual(mockResponse);
    });
  });

  // ==========================================================================
  // Download & Share Methods Tests
  // ==========================================================================

  describe("getDownloadUrl", () => {
    it("should get a presigned download URL", async () => {
      const mockResponse = {
        data: {
          downloadUrl: "https://storage.example.com/image.jpg?token=abc",
          expiresAt: "2024-12-31T23:59:59Z",
          fileName: "enhanced-image.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024000,
        },
        error: null,
        status: 200,
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getDownloadUrl("img-123");

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/images/img-123/download");
      expect(result).toEqual(mockResponse);
    });

    it("should handle error response", async () => {
      const mockResponse = {
        data: null,
        error: "Image not found",
        status: 404,
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getDownloadUrl("nonexistent");

      expect(result.error).toBe("Image not found");
      expect(result.data).toBeNull();
    });
  });

  describe("getShareLink", () => {
    it("should get a shareable link for an image", async () => {
      const mockResponse = {
        data: {
          shareUrl: "https://spike.land/s/abc123",
          shareToken: "abc123",
          expiresAt: null,
        },
        error: null,
        status: 200,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await getShareLink("img-123");

      expect(mockApiClient.post).toHaveBeenCalledWith("/api/images/img-123/share");
      expect(result).toEqual(mockResponse);
    });

    it("should handle error response", async () => {
      const mockResponse = {
        data: null,
        error: "Unauthorized",
        status: 401,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await getShareLink("img-123");

      expect(result.error).toBe("Unauthorized");
      expect(result.data).toBeNull();
    });
  });

  // ==========================================================================
  // Album Tests
  // ==========================================================================

  describe("getAlbums", () => {
    it("should get user albums", async () => {
      const mockResponse = {
        data: { albums: [{ id: "album-1", name: "My Album" }] },
        error: null,
        status: 200,
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await getAlbums();

      expect(mockApiClient.get).toHaveBeenCalledWith("/api/albums");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("createAlbum", () => {
    it("should create a new album with minimal params", async () => {
      const mockResponse = {
        data: { album: { id: "album-1", name: "New Album" } },
        error: null,
        status: 201,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await createAlbum({ name: "New Album" });

      expect(mockApiClient.post).toHaveBeenCalledWith("/api/albums", { name: "New Album" });
      expect(result).toEqual(mockResponse);
    });

    it("should create a new album with all params", async () => {
      const mockResponse = {
        data: { album: { id: "album-1", name: "New Album" } },
        error: null,
        status: 201,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const params = {
        name: "New Album",
        description: "A test album",
        privacy: "PUBLIC" as const,
        defaultTier: "TIER_2K" as const,
      };
      const result = await createAlbum(params);

      expect(mockApiClient.post).toHaveBeenCalledWith("/api/albums", params);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateAlbum", () => {
    it("should update an album", async () => {
      const mockResponse = {
        data: { album: { id: "album-1", name: "Updated Album" } },
        error: null,
        status: 200,
      };
      mockApiClient.patch.mockResolvedValue(mockResponse);

      const result = await updateAlbum("album-1", { name: "Updated Album" });

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        "/api/albums/album-1",
        { name: "Updated Album" },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("deleteAlbum", () => {
    it("should delete an album", async () => {
      const mockResponse = {
        data: { success: true },
        error: null,
        status: 200,
      };
      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await deleteAlbum("album-1");

      expect(mockApiClient.delete).toHaveBeenCalledWith("/api/albums/album-1");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("addImagesToAlbum", () => {
    it("should add images to an album", async () => {
      const mockResponse = {
        data: { success: true },
        error: null,
        status: 200,
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await addImagesToAlbum("album-1", ["img-1", "img-2"]);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/api/albums/album-1/images",
        { imageIds: ["img-1", "img-2"] },
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
