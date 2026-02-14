import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks for all register functions and availability checks
const {
  mockMcpServerInstance,
  mockRegisterGatewayMetaTools,
  mockRegisterImageTools,
  mockRegisterCodeSpaceTools,
  mockRegisterJulesTools,
  mockIsJulesAvailable,
  mockRegisterGatewayTools,
  mockIsGatewayAvailable,
  mockRegisterVaultTools,
  mockRegisterToolFactoryTools,
  mockRegisterBootstrapTools,
  mockRegisterAppsTools,
  mockRegisterOrbitWorkspaceTools,
  mockRegisterOrbitInboxTools,
  mockRegisterOrbitRelayTools,
  mockRegisterArenaTools,
  mockRegisterAlbumImagesTools,
  mockRegisterAlbumManagementTools,
  mockRegisterBatchEnhanceTools,
  mockRegisterEnhancementJobsTools,
  mockRegisterCreateTools,
  mockRegisterLearnItTools,
  mockRegisterAdminTools,
  mockRegisterAuthTools,
  mockRegisterPixelTools,
  mockRegisterOrbitAllocatorTools,
  mockRegisterOrbitCalendarTools,
  mockRegisterOrbitSocialTools,
  mockRegisterMerchTools,
  mockRegisterBrandBrainTools,
  mockRegisterConnectionsTools,
  mockRegisterBoxesTools,
  mockRegisterSmartRoutingTools,
  mockRegisterSkillStoreTools,
  mockRegisterWorkspacesTools,
  mockRegisterAgentManagementTools,
  mockRegisterSettingsTools,
  mockRegisterCreditsTools,
  mockRegisterBillingTools,
  mockRegisterPipelinesTools,
  mockRegisterAgencyTools,
  mockRegisterBlogTools,
  mockRegisterReportsTools,
  mockRegisterAudioTools,
  mockRegisterChatTools,
  mockRegisterNewsletterTools,
  mockRegisterTtsTools,
  mockRegistryInstance,
} = vi.hoisted(() => ({
  mockRegistryInstance: {} as Record<string, unknown>,
  mockMcpServerInstance: {
    registerTool: vi.fn().mockReturnValue({
      enabled: true,
      enable: vi.fn(),
      disable: vi.fn(),
    }),
  },
  mockRegisterGatewayMetaTools: vi.fn(),
  mockRegisterImageTools: vi.fn(),
  mockRegisterCodeSpaceTools: vi.fn(),
  mockRegisterJulesTools: vi.fn(),
  mockIsJulesAvailable: vi.fn(),
  mockRegisterGatewayTools: vi.fn(),
  mockIsGatewayAvailable: vi.fn(),
  mockRegisterVaultTools: vi.fn(),
  mockRegisterToolFactoryTools: vi.fn(),
  mockRegisterBootstrapTools: vi.fn(),
  mockRegisterAppsTools: vi.fn(),
  mockRegisterOrbitWorkspaceTools: vi.fn(),
  mockRegisterOrbitInboxTools: vi.fn(),
  mockRegisterOrbitRelayTools: vi.fn(),
  mockRegisterArenaTools: vi.fn(),
  mockRegisterAlbumImagesTools: vi.fn(),
  mockRegisterAlbumManagementTools: vi.fn(),
  mockRegisterBatchEnhanceTools: vi.fn(),
  mockRegisterEnhancementJobsTools: vi.fn(),
  mockRegisterCreateTools: vi.fn(),
  mockRegisterLearnItTools: vi.fn(),
  mockRegisterAdminTools: vi.fn(),
  mockRegisterAuthTools: vi.fn(),
  mockRegisterPixelTools: vi.fn(),
  mockRegisterOrbitAllocatorTools: vi.fn(),
  mockRegisterOrbitCalendarTools: vi.fn(),
  mockRegisterOrbitSocialTools: vi.fn(),
  mockRegisterMerchTools: vi.fn(),
  mockRegisterBrandBrainTools: vi.fn(),
  mockRegisterConnectionsTools: vi.fn(),
  mockRegisterBoxesTools: vi.fn(),
  mockRegisterSmartRoutingTools: vi.fn(),
  mockRegisterSkillStoreTools: vi.fn(),
  mockRegisterWorkspacesTools: vi.fn(),
  mockRegisterAgentManagementTools: vi.fn(),
  mockRegisterSettingsTools: vi.fn(),
  mockRegisterCreditsTools: vi.fn(),
  mockRegisterBillingTools: vi.fn(),
  mockRegisterPipelinesTools: vi.fn(),
  mockRegisterAgencyTools: vi.fn(),
  mockRegisterBlogTools: vi.fn(),
  mockRegisterReportsTools: vi.fn(),
  mockRegisterAudioTools: vi.fn(),
  mockRegisterChatTools: vi.fn(),
  mockRegisterNewsletterTools: vi.fn(),
  mockRegisterTtsTools: vi.fn(),
}));

// Mock McpServer constructor - must use function keyword for `new` support
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  const MockMcpServer = vi.fn(function McpServer() {
    return mockMcpServerInstance;
  });
  return { McpServer: MockMcpServer };
});

// Mock ToolRegistry - must use function keyword for `new` support
vi.mock("./tool-registry", () => {
  const MockToolRegistry = vi.fn(function ToolRegistry() {
    return mockRegistryInstance;
  });
  return { ToolRegistry: MockToolRegistry };
});

// Mock all tool registration modules
vi.mock("./tools/gateway-meta", () => ({ registerGatewayMetaTools: mockRegisterGatewayMetaTools }));
vi.mock("./tools/image", () => ({ registerImageTools: mockRegisterImageTools }));
vi.mock("./tools/codespace", () => ({ registerCodeSpaceTools: mockRegisterCodeSpaceTools }));
vi.mock("./tools/jules", () => ({ registerJulesTools: mockRegisterJulesTools, isJulesAvailable: mockIsJulesAvailable }));
vi.mock("./tools/gateway", () => ({ registerGatewayTools: mockRegisterGatewayTools, isGatewayAvailable: mockIsGatewayAvailable }));
vi.mock("./tools/vault", () => ({ registerVaultTools: mockRegisterVaultTools }));
vi.mock("./tools/tool-factory", () => ({ registerToolFactoryTools: mockRegisterToolFactoryTools }));
vi.mock("./tools/bootstrap", () => ({ registerBootstrapTools: mockRegisterBootstrapTools }));
vi.mock("./tools/apps", () => ({ registerAppsTools: mockRegisterAppsTools }));
vi.mock("./tools/orbit-workspace", () => ({ registerOrbitWorkspaceTools: mockRegisterOrbitWorkspaceTools }));
vi.mock("./tools/orbit-inbox", () => ({ registerOrbitInboxTools: mockRegisterOrbitInboxTools }));
vi.mock("./tools/orbit-relay", () => ({ registerOrbitRelayTools: mockRegisterOrbitRelayTools }));
vi.mock("./tools/arena", () => ({ registerArenaTools: mockRegisterArenaTools }));
vi.mock("./tools/album-images", () => ({ registerAlbumImagesTools: mockRegisterAlbumImagesTools }));
vi.mock("./tools/album-management", () => ({ registerAlbumManagementTools: mockRegisterAlbumManagementTools }));
vi.mock("./tools/batch-enhance", () => ({ registerBatchEnhanceTools: mockRegisterBatchEnhanceTools }));
vi.mock("./tools/enhancement-jobs", () => ({ registerEnhancementJobsTools: mockRegisterEnhancementJobsTools }));
vi.mock("./tools/create", () => ({ registerCreateTools: mockRegisterCreateTools }));
vi.mock("./tools/learnit", () => ({ registerLearnItTools: mockRegisterLearnItTools }));
vi.mock("./tools/admin", () => ({ registerAdminTools: mockRegisterAdminTools }));
vi.mock("./tools/auth", () => ({ registerAuthTools: mockRegisterAuthTools }));
vi.mock("./tools/pixel", () => ({ registerPixelTools: mockRegisterPixelTools }));
vi.mock("./tools/orbit-allocator", () => ({ registerOrbitAllocatorTools: mockRegisterOrbitAllocatorTools }));
vi.mock("./tools/orbit-calendar", () => ({ registerOrbitCalendarTools: mockRegisterOrbitCalendarTools }));
vi.mock("./tools/orbit-social", () => ({ registerOrbitSocialTools: mockRegisterOrbitSocialTools }));
vi.mock("./tools/merch", () => ({ registerMerchTools: mockRegisterMerchTools }));
vi.mock("./tools/brand-brain", () => ({ registerBrandBrainTools: mockRegisterBrandBrainTools }));
vi.mock("./tools/connections", () => ({ registerConnectionsTools: mockRegisterConnectionsTools }));
vi.mock("./tools/boxes", () => ({ registerBoxesTools: mockRegisterBoxesTools }));
vi.mock("./tools/smart-routing", () => ({ registerSmartRoutingTools: mockRegisterSmartRoutingTools }));
vi.mock("./tools/skill-store", () => ({ registerSkillStoreTools: mockRegisterSkillStoreTools }));
vi.mock("./tools/workspaces", () => ({ registerWorkspacesTools: mockRegisterWorkspacesTools }));
vi.mock("./tools/agent-management", () => ({ registerAgentManagementTools: mockRegisterAgentManagementTools }));
vi.mock("./tools/settings", () => ({ registerSettingsTools: mockRegisterSettingsTools }));
vi.mock("./tools/credits", () => ({ registerCreditsTools: mockRegisterCreditsTools }));
vi.mock("./tools/billing", () => ({ registerBillingTools: mockRegisterBillingTools }));
vi.mock("./tools/pipelines", () => ({ registerPipelinesTools: mockRegisterPipelinesTools }));
vi.mock("./tools/agency", () => ({ registerAgencyTools: mockRegisterAgencyTools }));
vi.mock("./tools/blog", () => ({ registerBlogTools: mockRegisterBlogTools }));
vi.mock("./tools/reports", () => ({ registerReportsTools: mockRegisterReportsTools }));
vi.mock("./tools/audio", () => ({ registerAudioTools: mockRegisterAudioTools }));
vi.mock("./tools/chat", () => ({ registerChatTools: mockRegisterChatTools }));
vi.mock("./tools/newsletter", () => ({ registerNewsletterTools: mockRegisterNewsletterTools }));
vi.mock("./tools/tts", () => ({ registerTtsTools: mockRegisterTtsTools }));

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolRegistry } from "./tool-registry";
import { createMcpServer } from "./mcp-server";

describe("createMcpServer", () => {
  const userId = "test-user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: both jules and gateway unavailable
    mockIsJulesAvailable.mockReturnValue(false);
    mockIsGatewayAvailable.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create McpServer with correct name, version, and capabilities", () => {
    createMcpServer(userId);

    expect(McpServer).toHaveBeenCalledWith(
      { name: "spike-land", version: "1.0.0" },
      { capabilities: { tools: { listChanged: true } } },
    );
  });

  it("should create a ToolRegistry with the McpServer instance", () => {
    createMcpServer(userId);

    expect(ToolRegistry).toHaveBeenCalledWith(mockMcpServerInstance);
  });

  it("should return the McpServer instance", () => {
    const result = createMcpServer(userId);

    expect(result).toBe(mockMcpServerInstance);
  });

  it("should call all unconditional register functions with registry and userId", () => {
    createMcpServer(userId);

    // All unconditional register functions
    const unconditionalRegisters = [
      mockRegisterGatewayMetaTools,
      mockRegisterImageTools,
      mockRegisterCodeSpaceTools,
      mockRegisterVaultTools,
      mockRegisterToolFactoryTools,
      mockRegisterBootstrapTools,
      mockRegisterAppsTools,
      mockRegisterOrbitWorkspaceTools,
      mockRegisterOrbitInboxTools,
      mockRegisterOrbitRelayTools,
      mockRegisterArenaTools,
      mockRegisterAlbumImagesTools,
      mockRegisterAlbumManagementTools,
      mockRegisterBatchEnhanceTools,
      mockRegisterEnhancementJobsTools,
      mockRegisterCreateTools,
      mockRegisterLearnItTools,
      mockRegisterAdminTools,
      mockRegisterAuthTools,
      mockRegisterPixelTools,
      mockRegisterOrbitAllocatorTools,
      mockRegisterOrbitCalendarTools,
      mockRegisterOrbitSocialTools,
      mockRegisterMerchTools,
      mockRegisterBrandBrainTools,
      mockRegisterConnectionsTools,
      mockRegisterBoxesTools,
      mockRegisterSmartRoutingTools,
      mockRegisterSkillStoreTools,
      mockRegisterWorkspacesTools,
      mockRegisterAgentManagementTools,
      mockRegisterSettingsTools,
      mockRegisterCreditsTools,
      mockRegisterBillingTools,
      mockRegisterPipelinesTools,
      mockRegisterAgencyTools,
      mockRegisterBlogTools,
      mockRegisterReportsTools,
      mockRegisterAudioTools,
      mockRegisterChatTools,
      mockRegisterNewsletterTools,
      mockRegisterTtsTools,
    ];

    for (const registerFn of unconditionalRegisters) {
      expect(registerFn).toHaveBeenCalledWith(mockRegistryInstance, userId);
    }
  });

  it("should register jules tools when isJulesAvailable returns true", () => {
    mockIsJulesAvailable.mockReturnValue(true);

    createMcpServer(userId);

    expect(mockRegisterJulesTools).toHaveBeenCalledWith(mockRegistryInstance, userId);
  });

  it("should skip jules tools when isJulesAvailable returns false", () => {
    mockIsJulesAvailable.mockReturnValue(false);

    createMcpServer(userId);

    expect(mockRegisterJulesTools).not.toHaveBeenCalled();
  });

  it("should register gateway tools when isGatewayAvailable returns true", () => {
    mockIsGatewayAvailable.mockReturnValue(true);

    createMcpServer(userId);

    expect(mockRegisterGatewayTools).toHaveBeenCalledWith(mockRegistryInstance, userId);
  });

  it("should skip gateway tools when isGatewayAvailable returns false", () => {
    mockIsGatewayAvailable.mockReturnValue(false);

    createMcpServer(userId);

    expect(mockRegisterGatewayTools).not.toHaveBeenCalled();
  });

  it("should register both jules and gateway when both are available", () => {
    mockIsJulesAvailable.mockReturnValue(true);
    mockIsGatewayAvailable.mockReturnValue(true);

    createMcpServer(userId);

    expect(mockRegisterJulesTools).toHaveBeenCalled();
    expect(mockRegisterGatewayTools).toHaveBeenCalled();
  });
});
