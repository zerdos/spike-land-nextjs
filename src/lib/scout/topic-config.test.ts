/**
 * Scout Topic Config Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    scoutTopic: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Import after mocks
import prisma from "@/lib/prisma";

import {
  createTopic,
  createTopicSchema,
  deleteTopic,
  getTopic,
  listTopicsByWorkspace,
  topicKeywordsSchema,
  updateTopic,
  updateTopicSchema,
} from "./topic-config";

describe("Topic Config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("topicKeywordsSchema", () => {
    it("should validate valid keywords object", () => {
      const validKeywords = {
        and: ["keyword1", "keyword2"],
        or: ["keyword3"],
        not: ["keyword4"],
      };

      const result = topicKeywordsSchema.parse(validKeywords);
      expect(result).toEqual(validKeywords);
    });

    it("should allow empty keywords object", () => {
      const result = topicKeywordsSchema.parse({});
      expect(result).toEqual({});
    });

    it("should allow partial keywords object", () => {
      const partial1 = { and: ["keyword1"] };
      const partial2 = { or: ["keyword2"] };
      const partial3 = { not: ["keyword3"] };

      expect(topicKeywordsSchema.parse(partial1)).toEqual(partial1);
      expect(topicKeywordsSchema.parse(partial2)).toEqual(partial2);
      expect(topicKeywordsSchema.parse(partial3)).toEqual(partial3);
    });
  });

  describe("createTopicSchema", () => {
    it("should validate valid topic creation data", () => {
      const validData = {
        name: "Test Topic",
        keywords: {
          and: ["keyword1"],
          or: ["keyword2"],
        },
        isActive: true,
      };

      const result = createTopicSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it("should use default isActive value", () => {
      const data = {
        name: "Test Topic",
        keywords: {},
      };

      const result = createTopicSchema.parse(data);
      expect(result.isActive).toBe(true);
    });

    it("should reject empty name", () => {
      const invalidData = {
        name: "",
        keywords: {},
      };

      expect(() => createTopicSchema.parse(invalidData)).toThrow();
    });

    it("should reject missing name", () => {
      const invalidData = {
        keywords: {},
      };

      expect(() => createTopicSchema.parse(invalidData)).toThrow();
    });
  });

  describe("updateTopicSchema", () => {
    it("should allow partial updates", () => {
      const partialData1 = { name: "Updated Name" };
      const partialData2 = { isActive: false };
      const partialData3 = { keywords: { and: ["new-keyword"] } };

      const result1 = updateTopicSchema.parse(partialData1);
      const result2 = updateTopicSchema.parse(partialData2);
      const result3 = updateTopicSchema.parse(partialData3);

      expect(result1.name).toBe(partialData1.name);
      expect(result2.isActive).toBe(partialData2.isActive);
      expect(result3.keywords).toEqual(partialData3.keywords);
    });

    it("should allow empty object", () => {
      const result = updateTopicSchema.parse({});
      // updateTopicSchema includes defaults from createTopicSchema
      expect(result).toBeDefined();
    });

    it("should validate name when provided", () => {
      expect(() => updateTopicSchema.parse({ name: "" })).toThrow();
    });
  });

  describe("createTopic", () => {
    it("should create a topic successfully", async () => {
      const workspaceId = "ws-1";
      const data = {
        name: "AI Trends",
        keywords: {
          and: ["artificial intelligence", "machine learning"],
          or: ["AI", "ML"],
        },
        isActive: true,
      };

      const mockTopic = {
        id: "topic-1",
        workspaceId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutTopic.create).mockResolvedValue(mockTopic as any);

      const result = await createTopic(workspaceId, data);

      expect(prisma.scoutTopic.create).toHaveBeenCalledWith({
        data: {
          workspaceId,
          ...data,
        },
      });

      expect(result).toEqual(mockTopic);
    });

    it("should use default isActive value when not provided", async () => {
      const workspaceId = "ws-1";
      const data = {
        name: "Tech News",
        keywords: { or: ["technology", "tech"] },
      };

      const mockTopic = {
        id: "topic-2",
        workspaceId,
        name: data.name,
        keywords: data.keywords,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutTopic.create).mockResolvedValue(mockTopic as any);

      await createTopic(workspaceId, data as any);

      expect(prisma.scoutTopic.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: true,
        }),
      });
    });

    it("should throw validation error for invalid data", async () => {
      const workspaceId = "ws-1";
      const invalidData = {
        name: "",
        keywords: {},
        isActive: true,
      };

      await expect(createTopic(workspaceId, invalidData)).rejects.toThrow(
        z.ZodError,
      );

      expect(prisma.scoutTopic.create).not.toHaveBeenCalled();
    });

    it("should handle minimal valid data", async () => {
      const workspaceId = "ws-1";
      const data = {
        name: "Minimal Topic",
        keywords: {},
        isActive: true,
      };

      const mockTopic = {
        id: "topic-3",
        workspaceId,
        name: data.name,
        keywords: data.keywords,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutTopic.create).mockResolvedValue(mockTopic as any);

      const result = await createTopic(workspaceId, data);

      expect(result.keywords).toEqual({});
    });
  });

  describe("getTopic", () => {
    it("should get topic by ID", async () => {
      const topicId = "topic-1";

      const mockTopic = {
        id: topicId,
        workspaceId: "ws-1",
        name: "Test Topic",
        keywords: { and: ["test"] },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutTopic.findUnique).mockResolvedValue(
        mockTopic as any,
      );

      const result = await getTopic(topicId);

      expect(prisma.scoutTopic.findUnique).toHaveBeenCalledWith({
        where: { id: topicId },
      });

      expect(result).toEqual(mockTopic);
    });

    it("should return null when topic not found", async () => {
      const topicId = "nonexistent";

      vi.mocked(prisma.scoutTopic.findUnique).mockResolvedValue(null);

      const result = await getTopic(topicId);

      expect(result).toBeNull();
    });
  });

  describe("listTopicsByWorkspace", () => {
    it("should list all topics for workspace", async () => {
      const workspaceId = "ws-1";

      const mockTopics = [
        {
          id: "topic-1",
          workspaceId,
          name: "Topic 1",
          keywords: { and: ["keyword1"] },
          isActive: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
        {
          id: "topic-2",
          workspaceId,
          name: "Topic 2",
          keywords: { or: ["keyword2"] },
          isActive: false,
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
        },
      ];

      vi.mocked(prisma.scoutTopic.findMany).mockResolvedValue(
        mockTopics as any,
      );

      const result = await listTopicsByWorkspace(workspaceId);

      expect(prisma.scoutTopic.findMany).toHaveBeenCalledWith({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
      });

      expect(result).toEqual(mockTopics);
    });

    it("should return empty array when no topics found", async () => {
      const workspaceId = "ws-empty";

      vi.mocked(prisma.scoutTopic.findMany).mockResolvedValue([]);

      const result = await listTopicsByWorkspace(workspaceId);

      expect(result).toEqual([]);
    });

    it("should sort topics by createdAt descending", async () => {
      const workspaceId = "ws-2";

      vi.mocked(prisma.scoutTopic.findMany).mockResolvedValue([]);

      await listTopicsByWorkspace(workspaceId);

      expect(prisma.scoutTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        }),
      );
    });
  });

  describe("updateTopic", () => {
    it("should update topic successfully", async () => {
      const topicId = "topic-1";
      const updateData = {
        name: "Updated Topic",
        isActive: false,
      };

      const mockUpdatedTopic = {
        id: topicId,
        workspaceId: "ws-1",
        name: updateData.name,
        keywords: { and: ["keyword"] },
        isActive: updateData.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutTopic.update).mockResolvedValue(
        mockUpdatedTopic as any,
      );

      const result = await updateTopic(topicId, updateData);

      expect(prisma.scoutTopic.update).toHaveBeenCalledWith({
        where: { id: topicId },
        data: updateData,
      });

      expect(result).toEqual(mockUpdatedTopic);
    });

    it("should update only provided fields", async () => {
      const topicId = "topic-2";
      const updateData = { name: "New Name" };

      const mockUpdatedTopic = {
        id: topicId,
        workspaceId: "ws-1",
        name: updateData.name,
        keywords: { or: ["keyword"] },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutTopic.update).mockResolvedValue(
        mockUpdatedTopic as any,
      );

      const result = await updateTopic(topicId, updateData);

      const callArgs = vi.mocked(prisma.scoutTopic.update).mock.calls[0]?.[0];
      expect(callArgs?.where).toEqual({ id: topicId });
      expect(callArgs?.data).toHaveProperty("name", updateData.name);

      expect(result.name).toBe(updateData.name);
    });

    it("should update keywords", async () => {
      const topicId = "topic-3";
      const updateData = {
        keywords: {
          and: ["new", "keywords"],
          not: ["exclude"],
        },
      };

      const mockUpdatedTopic = {
        id: topicId,
        workspaceId: "ws-1",
        name: "Topic",
        keywords: updateData.keywords,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutTopic.update).mockResolvedValue(
        mockUpdatedTopic as any,
      );

      const result = await updateTopic(topicId, updateData);

      expect(result.keywords).toEqual(updateData.keywords);
    });

    it("should throw validation error for invalid data", async () => {
      const topicId = "topic-4";
      const invalidData = { name: "" };

      await expect(updateTopic(topicId, invalidData)).rejects.toThrow(
        z.ZodError,
      );

      expect(prisma.scoutTopic.update).not.toHaveBeenCalled();
    });

    it("should handle empty update object", async () => {
      const topicId = "topic-5";
      const updateData = {};

      const mockTopic = {
        id: topicId,
        workspaceId: "ws-1",
        name: "Unchanged Topic",
        keywords: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutTopic.update).mockResolvedValue(mockTopic as any);

      await updateTopic(topicId, updateData);

      const callArgs = vi.mocked(prisma.scoutTopic.update).mock.calls[0]?.[0];
      expect(callArgs?.where).toEqual({ id: topicId });
    });
  });

  describe("deleteTopic", () => {
    it("should delete topic successfully", async () => {
      const topicId = "topic-1";

      const mockDeletedTopic = {
        id: topicId,
        workspaceId: "ws-1",
        name: "Deleted Topic",
        keywords: { and: ["test"] },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.scoutTopic.delete).mockResolvedValue(
        mockDeletedTopic as any,
      );

      const result = await deleteTopic(topicId);

      expect(prisma.scoutTopic.delete).toHaveBeenCalledWith({
        where: { id: topicId },
      });

      expect(result).toEqual(mockDeletedTopic);
    });

    it("should handle deletion of non-existent topic", async () => {
      const topicId = "nonexistent";

      vi.mocked(prisma.scoutTopic.delete).mockRejectedValue(
        new Error("Record not found"),
      );

      await expect(deleteTopic(topicId)).rejects.toThrow("Record not found");
    });
  });
});
