import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrandProfileData } from "./useBrandProfile";
import { useBrandProfile } from "./useBrandProfile";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockBrandProfile: BrandProfileData = {
  id: "profile-123",
  workspaceId: "workspace-456",
  name: "Test Brand",
  mission: "Test Mission",
  values: ["Innovation", "Trust"],
  toneDescriptors: {
    formalCasual: 30,
    technicalSimple: 70,
    seriousPlayful: 50,
    reservedEnthusiastic: 60,
  },
  logoUrl: "https://example.com/logo.png",
  logoR2Key: "brand-assets/workspace-456/logo.png",
  colorPalette: [{ name: "Primary", hex: "#0066FF" }],
  guardrails: [{
    id: "g1",
    type: "PROHIBITED_TOPIC",
    name: "Competitors",
    severity: "HIGH",
    isActive: true,
  }],
  vocabulary: [{
    id: "v1",
    type: "PREFERRED",
    term: "Customer",
    isActive: true,
  }],
  version: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("useBrandProfile", () => {
  const workspaceId = "workspace-456";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("starts with loading state when enabled", () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.brandProfile).toBeNull();
      expect(result.current.hasProfile).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("does not fetch when disabled", () => {
      const { result } = renderHook(() => useBrandProfile({ workspaceId, enabled: false }));

      expect(result.current.isLoading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does not fetch when workspaceId is empty", () => {
      const { result } = renderHook(() => useBrandProfile({ workspaceId: "" }));

      expect(result.current.isLoading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("fetching brand profile", () => {
    it("fetches profile on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBrandProfile),
      });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/workspaces/${workspaceId}/brand-profile`,
      );
      expect(result.current.brandProfile).toEqual(mockBrandProfile);
      expect(result.current.hasProfile).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("handles 404 response (no profile exists)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.brandProfile).toBeNull();
      expect(result.current.hasProfile).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("handles 401 unauthorized", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe("Unauthorized");
    });

    it("handles 403 forbidden", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe("Permission denied");
    });

    it("handles other error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe(
        "Failed to fetch brand profile",
      );
    });

    it("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe("Network error");
    });

    it("handles unknown error type", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe(
        "Failed to fetch brand profile",
      );
    });

    it("handles null response", async () => {
      mockFetch.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe("No response from server");
    });

    it("handles JSON parse error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe("Invalid JSON");
    });
  });

  describe("createProfile", () => {
    it("creates a brand profile successfully", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBrandProfile),
        });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const formData = {
        name: "Test Brand",
        mission: "Test Mission",
        values: ["Innovation", "Trust"],
        toneDescriptors: {
          formalCasual: 30,
          technicalSimple: 70,
          seriousPlayful: 50,
          reservedEnthusiastic: 60,
        },
        logoUrl: "https://example.com/logo.png",
        logoR2Key: "",
        colorPalette: [],
        guardrails: [],
        vocabulary: [],
      };

      let createdProfile: BrandProfileData | null = null;
      await act(async () => {
        createdProfile = await result.current.createProfile(formData);
      });

      expect(createdProfile).toEqual(mockBrandProfile);
      expect(result.current.brandProfile).toEqual(mockBrandProfile);
      expect(result.current.hasProfile).toBe(true);
      expect(result.current.isCreating).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/workspaces/${workspaceId}/brand-profile`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }),
      );
    });

    it("handles create error with error message from API", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: "Profile already exists" }),
        });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.createProfile({
            name: "Test",
            toneDescriptors: {
              formalCasual: 50,
              technicalSimple: 50,
              seriousPlayful: 50,
              reservedEnthusiastic: 50,
            },
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error?.message).toBe("Profile already exists");
      expect(result.current.isCreating).toBe(false);
    });

    it("handles create network error", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.createProfile({
            name: "Test",
            toneDescriptors: {
              formalCasual: 50,
              technicalSimple: 50,
              seriousPlayful: 50,
              reservedEnthusiastic: 50,
            },
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error?.message).toBe("Network error");
    });

    it("returns null if workspaceId is empty", async () => {
      const { result } = renderHook(() => useBrandProfile({ workspaceId: "", enabled: false }));

      let createdProfile: BrandProfileData | null = null;
      await act(async () => {
        createdProfile = await result.current.createProfile({
          name: "Test",
          toneDescriptors: {
            formalCasual: 50,
            technicalSimple: 50,
            seriousPlayful: 50,
            reservedEnthusiastic: 50,
          },
        });
      });

      expect(createdProfile).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("updateProfile", () => {
    it("updates a brand profile successfully", async () => {
      const updatedProfile = { ...mockBrandProfile, name: "Updated Brand" };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBrandProfile),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updatedProfile),
        });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.hasProfile).toBe(true);
      });

      let updated: BrandProfileData | null | undefined;
      await act(async () => {
        updated = await result.current.updateProfile({ name: "Updated Brand" });
      });

      expect(updated).toBeDefined();
      expect((updated as BrandProfileData).name).toBe("Updated Brand");
      expect(result.current.brandProfile?.name).toBe("Updated Brand");
      expect(result.current.isUpdating).toBe(false);
      expect(mockFetch).toHaveBeenLastCalledWith(
        `/api/workspaces/${workspaceId}/brand-profile`,
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Updated Brand" }),
        }),
      );
    });

    it("handles update error", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBrandProfile),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: "Validation failed" }),
        });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.hasProfile).toBe(true);
      });

      await act(async () => {
        try {
          await result.current.updateProfile({ name: "" });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error?.message).toBe("Validation failed");
      expect(result.current.isUpdating).toBe(false);
    });

    it("returns null if workspaceId is empty", async () => {
      const { result } = renderHook(() => useBrandProfile({ workspaceId: "", enabled: false }));

      let updated: BrandProfileData | null = null;
      await act(async () => {
        updated = await result.current.updateProfile({ name: "Test" });
      });

      expect(updated).toBeNull();
    });
  });

  describe("deleteProfile", () => {
    it("deletes a brand profile successfully", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBrandProfile),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.hasProfile).toBe(true);
      });

      let success = false;
      await act(async () => {
        success = await result.current.deleteProfile();
      });

      expect(success).toBe(true);
      expect(result.current.brandProfile).toBeNull();
      expect(result.current.hasProfile).toBe(false);
      expect(result.current.isDeleting).toBe(false);
      expect(mockFetch).toHaveBeenLastCalledWith(
        `/api/workspaces/${workspaceId}/brand-profile`,
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });

    it("handles delete error", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBrandProfile),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ error: "Not authorized" }),
        });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.hasProfile).toBe(true);
      });

      await act(async () => {
        try {
          await result.current.deleteProfile();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error?.message).toBe("Not authorized");
      expect(result.current.isDeleting).toBe(false);
      // Profile should still exist if delete failed
      expect(result.current.brandProfile).not.toBeNull();
    });

    it("returns false if workspaceId is empty", async () => {
      const { result } = renderHook(() => useBrandProfile({ workspaceId: "", enabled: false }));

      let success = true;
      await act(async () => {
        success = await result.current.deleteProfile();
      });

      expect(success).toBe(false);
    });
  });

  describe("refetch", () => {
    it("refetches the brand profile", async () => {
      const updatedProfile = { ...mockBrandProfile, name: "Refetched Brand" };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBrandProfile),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updatedProfile),
        });

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.brandProfile?.name).toBe("Test Brand");
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.brandProfile?.name).toBe("Refetched Brand");
    });
  });

  describe("state flags", () => {
    it("sets isCreating flag correctly", async () => {
      let resolveCreate: (value: unknown) => void = () => {};
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        })
        .mockImplementationOnce(() => createPromise);

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start create without awaiting
      act(() => {
        result.current.createProfile({
          name: "Test",
          toneDescriptors: {
            formalCasual: 50,
            technicalSimple: 50,
            seriousPlayful: 50,
            reservedEnthusiastic: 50,
          },
        });
      });

      // Should be creating
      expect(result.current.isCreating).toBe(true);

      // Resolve the create
      await act(async () => {
        resolveCreate({
          ok: true,
          json: () => Promise.resolve(mockBrandProfile),
        });
      });

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });
    });

    it("sets isUpdating flag correctly", async () => {
      let resolveUpdate: (value: unknown) => void = () => {};
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBrandProfile),
        })
        .mockImplementationOnce(() => updatePromise);

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.hasProfile).toBe(true);
      });

      // Start update without awaiting
      act(() => {
        result.current.updateProfile({ name: "Updated" });
      });

      // Should be updating
      expect(result.current.isUpdating).toBe(true);

      // Resolve the update
      await act(async () => {
        resolveUpdate({
          ok: true,
          json: () => Promise.resolve({ ...mockBrandProfile, name: "Updated" }),
        });
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });

    it("sets isDeleting flag correctly", async () => {
      let resolveDelete: (value: unknown) => void = () => {};
      const deletePromise = new Promise((resolve) => {
        resolveDelete = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBrandProfile),
        })
        .mockImplementationOnce(() => deletePromise);

      const { result } = renderHook(() => useBrandProfile({ workspaceId }));

      await waitFor(() => {
        expect(result.current.hasProfile).toBe(true);
      });

      // Start delete without awaiting
      act(() => {
        result.current.deleteProfile();
      });

      // Should be deleting
      expect(result.current.isDeleting).toBe(true);

      // Resolve the delete
      await act(async () => {
        resolveDelete({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });
  });
});
