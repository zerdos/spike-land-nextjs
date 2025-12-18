/**
 * useAudioStorage Hook - OPFS-based audio file storage
 * Resolves #332
 */

import { useCallback } from "react";
import type { AudioProject, SavedTrack, SaveTrackOptions, StorageResult } from "../types/storage";

// Base path for audio mixer files in OPFS
const AUDIO_MIXER_BASE_PATH = "audio-mixer";

/**
 * Generate a unique ID for tracks/projects
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get OPFS path for a track
 */
function getTrackPath(projectId: string, trackId: string, format: string): string {
  return `${AUDIO_MIXER_BASE_PATH}/projects/${projectId}/tracks/${trackId}.${format}`;
}

/**
 * Get OPFS path for project metadata
 */
function getProjectMetadataPath(projectId: string): string {
  return `${AUDIO_MIXER_BASE_PATH}/projects/${projectId}/metadata.json`;
}

/**
 * Check if OPFS is available in the browser
 */
async function isOPFSAvailable(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage) {
      return false;
    }
    await navigator.storage.getDirectory();
    return true;
  } catch {
    return false;
  }
}

/**
 * Hook for managing audio storage in OPFS
 */
export function useAudioStorage() {
  /**
   * Check if OPFS is supported
   */
  const checkSupport = useCallback(async (): Promise<boolean> => {
    return isOPFSAvailable();
  }, []);

  /**
   * Save an audio track to OPFS
   */
  const saveTrack = useCallback(
    async (
      audioData: Uint8Array,
      options: SaveTrackOptions,
    ): Promise<StorageResult<SavedTrack>> => {
      try {
        // Dynamic import to avoid SSR issues
        const { writeFile, mkdir } = await import("@spike-npm-land/opfs-node-adapter");

        const trackId = generateId();
        const trackPath = getTrackPath(options.projectId, trackId, options.format);

        // Ensure directory exists
        await mkdir(`${AUDIO_MIXER_BASE_PATH}/projects/${options.projectId}/tracks`, {
          recursive: true,
        });

        // Write the audio file
        await writeFile(trackPath, audioData);

        const savedTrack: SavedTrack = {
          id: trackId,
          name: options.name,
          format: options.format,
          duration: options.duration,
          sizeBytes: audioData.length,
          storageLocation: "opfs",
          opfsPath: trackPath,
          volume: options.volume ?? 1.0,
          muted: options.muted ?? false,
          solo: options.solo ?? false,
          createdAt: new Date().toISOString(),
        };

        return { success: true, data: savedTrack };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to save track",
        };
      }
    },
    [],
  );

  /**
   * Load an audio track from OPFS
   */
  const loadTrack = useCallback(
    async (track: SavedTrack): Promise<StorageResult<Uint8Array>> => {
      try {
        if (!track.opfsPath) {
          return { success: false, error: "Track has no OPFS path" };
        }

        const { readFile } = await import("@spike-npm-land/opfs-node-adapter");
        const data = await readFile(track.opfsPath, null);

        // Convert Buffer to Uint8Array
        const uint8Array = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

        return { success: true, data: uint8Array };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to load track",
        };
      }
    },
    [],
  );

  /**
   * Delete a track from OPFS
   */
  const deleteTrack = useCallback(async (track: SavedTrack): Promise<StorageResult> => {
    try {
      if (!track.opfsPath) {
        return { success: false, error: "Track has no OPFS path" };
      }

      const { rm } = await import("@spike-npm-land/opfs-node-adapter");
      await rm(track.opfsPath);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete track",
      };
    }
  }, []);

  /**
   * Save project metadata to OPFS
   */
  const saveProject = useCallback(async (project: AudioProject): Promise<StorageResult> => {
    try {
      const { writeFile, mkdir } = await import("@spike-npm-land/opfs-node-adapter");

      const metadataPath = getProjectMetadataPath(project.id);

      // Ensure directory exists
      await mkdir(`${AUDIO_MIXER_BASE_PATH}/projects/${project.id}`, { recursive: true });

      // Write metadata as JSON
      const metadata = JSON.stringify(project, null, 2);
      await writeFile(metadataPath, metadata);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save project",
      };
    }
  }, []);

  /**
   * Load project metadata from OPFS
   */
  const loadProject = useCallback(
    async (projectId: string): Promise<StorageResult<AudioProject>> => {
      try {
        const { readFile } = await import("@spike-npm-land/opfs-node-adapter");

        const metadataPath = getProjectMetadataPath(projectId);
        const data = await readFile(metadataPath, "utf8");
        const project = JSON.parse(data as string) as AudioProject;

        return { success: true, data: project };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to load project",
        };
      }
    },
    [],
  );

  /**
   * List all projects from OPFS
   */
  const listProjects = useCallback(async (): Promise<StorageResult<AudioProject[]>> => {
    try {
      const { glob, readFile } = await import("@spike-npm-land/opfs-node-adapter");

      // Find all metadata files
      const metadataFiles = await glob(`${AUDIO_MIXER_BASE_PATH}/projects/*/metadata.json`);

      const projects: AudioProject[] = [];
      for (const filePath of metadataFiles) {
        try {
          const data = await readFile(filePath, "utf8");
          const project = JSON.parse(data as string) as AudioProject;
          projects.push(project);
        } catch {
          // Skip corrupted metadata files
          console.warn(`Failed to load project metadata from ${filePath}`);
        }
      }

      // Sort by updatedAt descending
      projects.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      return { success: true, data: projects };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list projects",
      };
    }
  }, []);

  /**
   * Delete a project and all its tracks from OPFS
   */
  const deleteProject = useCallback(
    async (projectId: string): Promise<StorageResult> => {
      try {
        const { rm } = await import("@spike-npm-land/opfs-node-adapter");

        const projectPath = `${AUDIO_MIXER_BASE_PATH}/projects/${projectId}`;
        await rm(projectPath, { recursive: true });

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete project",
        };
      }
    },
    [],
  );

  /**
   * Create a new empty project
   */
  const createProject = useCallback(
    async (name: string, description?: string): Promise<StorageResult<AudioProject>> => {
      try {
        const now = new Date().toISOString();
        const project: AudioProject = {
          id: generateId(),
          name,
          description,
          tracks: [],
          masterVolume: 0.8,
          createdAt: now,
          updatedAt: now,
        };

        const saveResult = await saveProject(project);
        if (!saveResult.success) {
          return { success: false, error: saveResult.error };
        }

        return { success: true, data: project };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create project",
        };
      }
    },
    [saveProject],
  );

  return {
    checkSupport,
    saveTrack,
    loadTrack,
    deleteTrack,
    saveProject,
    loadProject,
    listProjects,
    deleteProject,
    createProject,
  };
}
