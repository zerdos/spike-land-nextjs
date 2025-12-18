/**
 * useAudioStorage Hook Tests
 * Resolves #332
 */

import * as opfsMock from "@spike-npm-land/opfs-node-adapter";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioProject, SavedTrack } from "../types/storage";
import { useAudioStorage } from "./useAudioStorage";

// Get the mocked functions from the aliased module
const mockWriteFile = opfsMock.writeFile as ReturnType<typeof vi.fn>;
const mockReadFile = opfsMock.readFile as ReturnType<typeof vi.fn>;
const mockRm = opfsMock.rm as ReturnType<typeof vi.fn>;
const mockMkdir = opfsMock.mkdir as ReturnType<typeof vi.fn>;
const mockGlob = opfsMock.glob as ReturnType<typeof vi.fn>;

describe("useAudioStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(Buffer.from("test"));
    mockRm.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockGlob.mockResolvedValue([]);

    // Mock navigator.storage
    Object.defineProperty(globalThis, "navigator", {
      value: {
        storage: {
          getDirectory: vi.fn().mockResolvedValue({}),
        },
      },
      writable: true,
    });
  });

  describe("checkSupport", () => {
    it("returns true when OPFS is available", async () => {
      const { result } = renderHook(() => useAudioStorage());

      let supported = false;
      await act(async () => {
        supported = await result.current.checkSupport();
      });

      expect(supported).toBe(true);
    });

    it("returns false when OPFS is not available", async () => {
      Object.defineProperty(globalThis, "navigator", {
        value: {
          storage: undefined,
        },
        writable: true,
      });

      const { result } = renderHook(() => useAudioStorage());

      let supported = false;
      await act(async () => {
        supported = await result.current.checkSupport();
      });

      expect(supported).toBe(false);
    });
  });

  describe("saveTrack", () => {
    it("saves an audio track to OPFS", async () => {
      const { result } = renderHook(() => useAudioStorage());

      const audioData = new Uint8Array([1, 2, 3, 4]);
      const options = {
        projectId: "project-123",
        name: "Test Track",
        format: "wav",
        duration: 10,
      };

      let saveResult: { success: boolean; data?: SavedTrack; } = { success: false };
      await act(async () => {
        saveResult = await result.current.saveTrack(audioData, options);
      });

      expect(saveResult.success).toBe(true);
      expect(saveResult.data).toBeDefined();
      expect(saveResult.data?.name).toBe("Test Track");
      expect(saveResult.data?.format).toBe("wav");
      expect(saveResult.data?.duration).toBe(10);
      expect(saveResult.data?.sizeBytes).toBe(4);
      expect(saveResult.data?.storageLocation).toBe("opfs");
      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it("handles save errors", async () => {
      mockWriteFile.mockRejectedValue(new Error("Write failed"));
      const { result } = renderHook(() => useAudioStorage());

      const audioData = new Uint8Array([1, 2, 3, 4]);
      const options = {
        projectId: "project-123",
        name: "Test Track",
        format: "wav",
        duration: 10,
      };

      let saveResult: { success: boolean; error?: string; } = { success: false };
      await act(async () => {
        saveResult = await result.current.saveTrack(audioData, options);
      });

      expect(saveResult.success).toBe(false);
      expect(saveResult.error).toBe("Write failed");
    });
  });

  describe("loadTrack", () => {
    it("loads an audio track from OPFS", async () => {
      const mockBuffer = Buffer.from([1, 2, 3, 4]);
      mockReadFile.mockResolvedValue(mockBuffer);

      const { result } = renderHook(() => useAudioStorage());

      const track: SavedTrack = {
        id: "track-123",
        name: "Test Track",
        format: "wav",
        duration: 10,
        sizeBytes: 4,
        storageLocation: "opfs",
        opfsPath: "audio-mixer/projects/project-123/tracks/track-123.wav",
        volume: 1.0,
        muted: false,
        solo: false,
        createdAt: new Date().toISOString(),
      };

      let loadResult: { success: boolean; data?: Uint8Array; } = { success: false };
      await act(async () => {
        loadResult = await result.current.loadTrack(track);
      });

      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toBeInstanceOf(Uint8Array);
      expect(mockReadFile).toHaveBeenCalledWith(track.opfsPath, null);
    });

    it("fails when track has no OPFS path", async () => {
      const { result } = renderHook(() => useAudioStorage());

      const track: SavedTrack = {
        id: "track-123",
        name: "Test Track",
        format: "wav",
        duration: 10,
        sizeBytes: 4,
        storageLocation: "opfs",
        volume: 1.0,
        muted: false,
        solo: false,
        createdAt: new Date().toISOString(),
      };

      let loadResult: { success: boolean; error?: string; } = { success: false };
      await act(async () => {
        loadResult = await result.current.loadTrack(track);
      });

      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toBe("Track has no OPFS path");
    });
  });

  describe("deleteTrack", () => {
    it("deletes a track from OPFS", async () => {
      const { result } = renderHook(() => useAudioStorage());

      const track: SavedTrack = {
        id: "track-123",
        name: "Test Track",
        format: "wav",
        duration: 10,
        sizeBytes: 4,
        storageLocation: "opfs",
        opfsPath: "audio-mixer/projects/project-123/tracks/track-123.wav",
        volume: 1.0,
        muted: false,
        solo: false,
        createdAt: new Date().toISOString(),
      };

      let deleteResult: { success: boolean; } = { success: false };
      await act(async () => {
        deleteResult = await result.current.deleteTrack(track);
      });

      expect(deleteResult.success).toBe(true);
      expect(mockRm).toHaveBeenCalledWith(track.opfsPath);
    });
  });

  describe("saveProject and loadProject", () => {
    it("saves and loads project metadata", async () => {
      const project: AudioProject = {
        id: "project-123",
        name: "Test Project",
        tracks: [],
        masterVolume: 0.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockReadFile.mockResolvedValue(JSON.stringify(project));

      const { result } = renderHook(() => useAudioStorage());

      // Save project
      let saveResult: { success: boolean; } = { success: false };
      await act(async () => {
        saveResult = await result.current.saveProject(project);
      });

      expect(saveResult.success).toBe(true);
      expect(mockWriteFile).toHaveBeenCalled();

      // Load project
      let loadResult: { success: boolean; data?: AudioProject; } = { success: false };
      await act(async () => {
        loadResult = await result.current.loadProject("project-123");
      });

      expect(loadResult.success).toBe(true);
      expect(loadResult.data?.name).toBe("Test Project");
    });
  });

  describe("listProjects", () => {
    it("lists all projects from OPFS", async () => {
      const projects: AudioProject[] = [
        {
          id: "project-1",
          name: "Project 1",
          tracks: [],
          masterVolume: 0.8,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
        },
        {
          id: "project-2",
          name: "Project 2",
          tracks: [],
          masterVolume: 0.8,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-03T00:00:00.000Z",
        },
      ];

      mockGlob.mockResolvedValue([
        "audio-mixer/projects/project-1/metadata.json",
        "audio-mixer/projects/project-2/metadata.json",
      ]);

      let callIndex = 0;
      mockReadFile.mockImplementation(() => {
        const result = JSON.stringify(projects[callIndex]);
        callIndex++;
        return Promise.resolve(result);
      });

      const { result } = renderHook(() => useAudioStorage());

      let listResult: { success: boolean; data?: AudioProject[]; } = { success: false };
      await act(async () => {
        listResult = await result.current.listProjects();
      });

      expect(listResult.success).toBe(true);
      expect(listResult.data).toHaveLength(2);
      // Should be sorted by updatedAt descending
      expect(listResult.data?.[0].name).toBe("Project 2");
    });
  });

  describe("deleteProject", () => {
    it("deletes a project and all its tracks", async () => {
      const { result } = renderHook(() => useAudioStorage());

      let deleteResult: { success: boolean; } = { success: false };
      await act(async () => {
        deleteResult = await result.current.deleteProject("project-123");
      });

      expect(deleteResult.success).toBe(true);
      expect(mockRm).toHaveBeenCalledWith(
        "audio-mixer/projects/project-123",
        { recursive: true },
      );
    });
  });

  describe("createProject", () => {
    it("creates a new empty project", async () => {
      const { result } = renderHook(() => useAudioStorage());

      let createResult: { success: boolean; data?: AudioProject; } = { success: false };
      await act(async () => {
        createResult = await result.current.createProject("New Project", "Description");
      });

      expect(createResult.success).toBe(true);
      expect(createResult.data?.name).toBe("New Project");
      expect(createResult.data?.description).toBe("Description");
      expect(createResult.data?.tracks).toHaveLength(0);
      expect(createResult.data?.masterVolume).toBe(0.8);
      expect(mockWriteFile).toHaveBeenCalled();
    });
  });
});
