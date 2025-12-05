import { describe, expect, it } from "vitest";
import * as webrtcConfig from "./config";
import * as webrtcIndex from "./index";
import * as webrtcUtils from "./utils";

describe("lib/webrtc/index barrel exports", () => {
  it("should export all utils functions", () => {
    // Verify that utils exports are re-exported
    expect(webrtcIndex.getUserMediaStream).toBeDefined();
    expect(webrtcIndex.getDisplayMediaStream).toBeDefined();
    expect(webrtcIndex.stopMediaStream).toBeDefined();
    expect(webrtcIndex.getStreamMetadata).toBeDefined();
    expect(webrtcIndex.monitorStreamHealth).toBeDefined();
    expect(webrtcIndex.generatePeerId).toBeDefined();
    expect(webrtcIndex.isWebRTCSupported).toBeDefined();
    expect(webrtcIndex.createWebRTCError).toBeDefined();

    // Verify they match the actual utils exports
    expect(webrtcIndex.getUserMediaStream).toBe(webrtcUtils.getUserMediaStream);
    expect(webrtcIndex.getDisplayMediaStream).toBe(webrtcUtils.getDisplayMediaStream);
    expect(webrtcIndex.stopMediaStream).toBe(webrtcUtils.stopMediaStream);
    expect(webrtcIndex.getStreamMetadata).toBe(webrtcUtils.getStreamMetadata);
  });

  it("should export all config functions", () => {
    // Verify that config exports are re-exported
    expect(webrtcIndex.getPeerServerConfig).toBeDefined();
    expect(webrtcIndex.createPeerConfig).toBeDefined();
    expect(webrtcIndex.getAppBaseUrl).toBeDefined();

    // Verify they match the actual config exports
    expect(webrtcIndex.getPeerServerConfig).toBe(webrtcConfig.getPeerServerConfig);
    expect(webrtcIndex.createPeerConfig).toBe(webrtcConfig.createPeerConfig);
    expect(webrtcIndex.getAppBaseUrl).toBe(webrtcConfig.getAppBaseUrl);
  });
});
