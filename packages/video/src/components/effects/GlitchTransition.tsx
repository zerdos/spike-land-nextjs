import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { glitchOffset } from "../../lib/animations";
import { GLITCH_CONFIG } from "../../lib/constants";

type GlitchTransitionProps = {
  children: React.ReactNode;
  startFrame: number;
  duration?: number;
  intensity?: number;
};

export function GlitchTransition({
  children,
  startFrame,
  duration = GLITCH_CONFIG.duration,
  intensity = 1,
}: GlitchTransitionProps) {
  const frame = useCurrentFrame();

  const endFrame = startFrame + duration;
  const isActive = frame >= startFrame && frame <= endFrame;

  if (!isActive) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  const progress = (frame - startFrame) / duration;

  // Intensity peaks in the middle of the transition
  const peakIntensity = Math.sin(progress * Math.PI) * intensity;

  // RGB split offsets
  const rgbOffset = GLITCH_CONFIG.rgbOffset * peakIntensity;
  const redX = glitchOffset(frame, rgbOffset, 0);
  const redY = glitchOffset(frame, rgbOffset * 0.5, 10);
  const blueX = glitchOffset(frame, rgbOffset, 100);
  const blueY = glitchOffset(frame, rgbOffset * 0.5, 110);

  // Horizontal slice displacement
  const sliceOffset = glitchOffset(frame, 20 * peakIntensity, 200);

  // Noise overlay opacity
  const noiseOpacity = GLITCH_CONFIG.noiseIntensity * peakIntensity;

  return (
    <AbsoluteFill>
      {/* Red channel */}
      <AbsoluteFill
        style={{
          transform: `translate(${redX}px, ${redY}px)`,
          mixBlendMode: "screen",
          filter: "saturate(0) brightness(1.5)",
          opacity: 0.6,
        }}
      >
        <div style={{ filter: "url(#red-channel)" }}>{children}</div>
      </AbsoluteFill>

      {/* Blue channel */}
      <AbsoluteFill
        style={{
          transform: `translate(${blueX}px, ${blueY}px)`,
          mixBlendMode: "screen",
          filter: "saturate(0) brightness(1.5)",
          opacity: 0.6,
        }}
      >
        <div style={{ filter: "url(#blue-channel)" }}>{children}</div>
      </AbsoluteFill>

      {/* Main content with slice displacement */}
      <AbsoluteFill
        style={{
          clipPath: peakIntensity > 0.3
            ? `polygon(0 0, 100% 0, 100% 30%, ${50 + sliceOffset}% 30%, ${
              50 + sliceOffset
            }% 70%, 100% 70%, 100% 100%, 0 100%)`
            : "none",
        }}
      >
        {children}
      </AbsoluteFill>

      {/* Scan lines overlay */}
      <ScanLines opacity={peakIntensity * 0.3} />

      {/* Noise overlay */}
      <NoiseOverlay opacity={noiseOpacity} frame={frame} />

      {/* SVG filters for color channel separation */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="red-channel">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="blue-channel">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>
    </AbsoluteFill>
  );
}

type ScanLinesProps = {
  opacity?: number;
  gap?: number;
};

export function ScanLines({
  opacity = 0.1,
  gap = GLITCH_CONFIG.scanLineGap,
}: ScanLinesProps) {
  return (
    <AbsoluteFill
      style={{
        background: `repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, ${opacity}) 0px,
          rgba(0, 0, 0, ${opacity}) 1px,
          transparent 1px,
          transparent ${gap}px
        )`,
        pointerEvents: "none",
      }}
    />
  );
}

type NoiseOverlayProps = {
  opacity?: number;
  frame: number;
};

export function NoiseOverlay({ opacity = 0.05, frame }: NoiseOverlayProps) {
  // Create a pseudo-random pattern based on frame
  const seed = frame * 12345;

  return (
    <AbsoluteFill
      style={{
        opacity,
        pointerEvents: "none",
        background:
          `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${seed}' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}
