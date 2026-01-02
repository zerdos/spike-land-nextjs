import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, POST } from "./route";

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  url = "http://localhost:3000/api/tabletop/rooms/test-room/peers",
): NextRequest {
  const req = new NextRequest(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return req;
}

// Helper to create mock params
function createMockParams(
  roomId: string,
): { params: Promise<{ roomId: string; }>; } {
  return { params: Promise.resolve({ roomId }) };
}

describe("Peer Registry API", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("POST /api/tabletop/rooms/[roomId]/peers", () => {
    it("should register a new peer and return empty peer list for first peer", async () => {
      const request = createMockRequest("POST", { peerId: "peer-1" });
      const params = createMockParams("room-1");

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.roomId).toBe("room-1");
      expect(data.peers).toEqual([]);
    });

    it("should return 400 if peerId is missing", async () => {
      const request = createMockRequest("POST", {});
      const params = createMockParams("room-1");

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("peerId is required");
    });

    it("should return 400 if peerId is not a string", async () => {
      const request = createMockRequest("POST", { peerId: 123 });
      const params = createMockParams("room-1");

      const response = await POST(request, params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("peerId is required");
    });

    it("should return other peers when registering", async () => {
      const params = createMockParams("room-2");

      // Register first peer
      await POST(createMockRequest("POST", { peerId: "peer-1" }), params);

      // Register second peer
      const response = await POST(
        createMockRequest("POST", { peerId: "peer-2" }),
        createMockParams("room-2"),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.peers).toEqual(["peer-1"]);
    });

    it("should update lastSeen timestamp on re-registration", async () => {
      const params = createMockParams("room-3");

      // Register peer
      await POST(createMockRequest("POST", { peerId: "peer-1" }), params);

      // Advance time by 15 seconds
      vi.advanceTimersByTime(15000);

      // Re-register same peer
      const response = await POST(
        createMockRequest("POST", { peerId: "peer-1" }),
        createMockParams("room-3"),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should cleanup stale peers during registration", async () => {
      const params = createMockParams("room-4");

      // Register first peer
      await POST(createMockRequest("POST", { peerId: "peer-1" }), params);

      // Advance time past timeout (30 seconds)
      vi.advanceTimersByTime(31000);

      // Register second peer - first peer should be cleaned up
      const response = await POST(
        createMockRequest("POST", { peerId: "peer-2" }),
        createMockParams("room-4"),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.peers).toEqual([]); // peer-1 should be cleaned up
    });
  });

  describe("GET /api/tabletop/rooms/[roomId]/peers", () => {
    it("should return empty list for non-existent room", async () => {
      const request = createMockRequest("GET");
      const params = createMockParams("non-existent-room");

      const response = await GET(request, params);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.peers).toEqual([]);
      expect(data.roomId).toBe("non-existent-room");
    });

    it("should return all peers in a room", async () => {
      const params = createMockParams("room-5");

      // Register two peers
      await POST(createMockRequest("POST", { peerId: "peer-1" }), params);
      await POST(
        createMockRequest("POST", { peerId: "peer-2" }),
        createMockParams("room-5"),
      );

      // Get peers
      const response = await GET(
        createMockRequest("GET"),
        createMockParams("room-5"),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.peers).toHaveLength(2);
      expect(data.peers).toContain("peer-1");
      expect(data.peers).toContain("peer-2");
    });

    it("should not return stale peers", async () => {
      const params = createMockParams("room-6");

      // Register peer
      await POST(createMockRequest("POST", { peerId: "peer-1" }), params);

      // Advance time past timeout
      vi.advanceTimersByTime(31000);

      // Get peers - should be empty due to cleanup
      const response = await GET(
        createMockRequest("GET"),
        createMockParams("room-6"),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.peers).toEqual([]);
    });
  });

  describe("DELETE /api/tabletop/rooms/[roomId]/peers", () => {
    it("should remove a peer from a room", async () => {
      const params = createMockParams("room-7");

      // Register two peers
      await POST(createMockRequest("POST", { peerId: "peer-1" }), params);
      await POST(
        createMockRequest("POST", { peerId: "peer-2" }),
        createMockParams("room-7"),
      );

      // Delete peer-1
      const deleteUrl = "http://localhost:3000/api/tabletop/rooms/room-7/peers?peerId=peer-1";
      const deleteRequest = new NextRequest(deleteUrl, { method: "DELETE" });
      const deleteResponse = await DELETE(
        deleteRequest,
        createMockParams("room-7"),
      );
      const deleteData = await deleteResponse.json();

      expect(deleteResponse.status).toBe(200);
      expect(deleteData.success).toBe(true);

      // Verify peer-1 is removed
      const getResponse = await GET(
        createMockRequest("GET"),
        createMockParams("room-7"),
      );
      const getData = await getResponse.json();

      expect(getData.peers).toEqual(["peer-2"]);
    });

    it("should return 400 if peerId query param is missing", async () => {
      const deleteUrl = "http://localhost:3000/api/tabletop/rooms/room-8/peers";
      const deleteRequest = new NextRequest(deleteUrl, { method: "DELETE" });
      const response = await DELETE(deleteRequest, createMockParams("room-8"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("peerId query parameter is required");
    });

    it("should handle deleting non-existent peer gracefully", async () => {
      const deleteUrl = "http://localhost:3000/api/tabletop/rooms/room-9/peers?peerId=non-existent";
      const deleteRequest = new NextRequest(deleteUrl, { method: "DELETE" });
      const response = await DELETE(deleteRequest, createMockParams("room-9"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should remove empty room after last peer is deleted", async () => {
      const params = createMockParams("room-10");

      // Register single peer
      await POST(createMockRequest("POST", { peerId: "peer-1" }), params);

      // Delete the peer
      const deleteUrl = "http://localhost:3000/api/tabletop/rooms/room-10/peers?peerId=peer-1";
      const deleteRequest = new NextRequest(deleteUrl, { method: "DELETE" });
      await DELETE(deleteRequest, createMockParams("room-10"));

      // Verify room is empty
      const response = await GET(
        createMockRequest("GET"),
        createMockParams("room-10"),
      );
      const data = await response.json();

      expect(data.peers).toEqual([]);
    });
  });
});
