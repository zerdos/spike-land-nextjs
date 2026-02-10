import { describe, expect, it, vi } from "vitest";

// Mock the clients
vi.mock("./clients/bridgemind-client", () => {
  return {
    getBridgeMindClient: () => ({
      isAvailable() {
        return false;
      },
    }),
  };
});

vi.mock("./clients/github-projects-client", () => {
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
