import { describe, expect, it, vi } from "vitest";

// Mock the clients as classes (constructors)
vi.mock("../../../packages/mcp-server/src/clients/bridgemind-client", () => {
  return {
    BridgeMindClient: class MockBridgeMindClient {
      isAvailable() {
        return false;
      }
    },
  };
});

vi.mock("../../../packages/mcp-server/src/clients/github-projects-client", () => {
  return {
    GitHubProjectsClient: class MockGitHubProjectsClient {
      isAvailable() {
        return false;
      }
    },
  };
});

const { createBridgeMindClient, createGitHubProjectsClient } = await import(
  "./create-sync-clients"
);

describe("createBridgeMindClient", () => {
  it("should return a BridgeMindClient instance", () => {
    const client = createBridgeMindClient();
    expect(client).toBeDefined();
    expect(typeof client.isAvailable).toBe("function");
  });
});

describe("createGitHubProjectsClient", () => {
  it("should return a GitHubProjectsClient instance", () => {
    const client = createGitHubProjectsClient();
    expect(client).toBeDefined();
    expect(typeof client.isAvailable).toBe("function");
  });
});
