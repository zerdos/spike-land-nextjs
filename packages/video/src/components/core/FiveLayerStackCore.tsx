import { Fragment, type FC } from "react";
import { COLORS, VERITASIUM_COLORS } from "../../lib/constants";
import { GlassmorphismCardCore } from "./ui/GlassmorphismCardCore";

export type FiveLayerStackCoreProps = {
  revealCount: number;
  progress: number; // 0-1 for the whole stack entrance
  className?: string;
};

const LAYERS = [
  {
    label: "Identity",
    description: "Who the agent is",
    color: VERITASIUM_COLORS.planning,
    group: "conserved" as const,
  },
  {
    label: "Knowledge",
    description: "What it knows",
    color: VERITASIUM_COLORS.generating,
    group: "conserved" as const,
  },
  {
    label: "Examples",
    description: "How it learned",
    color: VERITASIUM_COLORS.transpiling,
    group: "conserved" as const,
  },
  {
    label: "Constraints",
    description: "Rules & guardrails",
    color: VERITASIUM_COLORS.fixing,
    group: "dynamic" as const,
  },
  {
    label: "Tools",
    description: "What it can do",
    color: VERITASIUM_COLORS.learning,
    group: "dynamic" as const,
  },
];

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const FiveLayerStackCore: FC<FiveLayerStackCoreProps> = ({
  revealCount,
  progress,
  className,
}) => {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        position: "relative",
      }}
    >
      {/* Layers render bottom-to-top visually, but array is top-to-bottom in DOM */}
      {[...LAYERS].reverse().map((layer, reversedIndex) => {
        const layerIndex = LAYERS.length - 1 - reversedIndex;
        if (layerIndex >= revealCount) return null;

        // Progress for this specific layer
        const layerProgress = clamp((progress * 2) - (layerIndex * 0.2), 0, 1);

        const isConserved = layer.group === "conserved";
        const borderColor = isConserved ? VERITASIUM_COLORS.generating : VERITASIUM_COLORS.fixing;
        const badgeLabel = isConserved ? "CONSERVED" : "DYNAMIC";
        const badgeColor = isConserved ? VERITASIUM_COLORS.generating : VERITASIUM_COLORS.fixing;

        // Show cache indicator between conserved and dynamic groups
        const showCacheIndicator = layerIndex === 2 && revealCount > 3;
        const cacheIndicatorProgress = clamp((progress * 2) - (2.5 * 0.2), 0, 1);

        return (
          <Fragment key={layer.label}>
            {/* Cache indicator between groups */}
            {showCacheIndicator && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: "8px 0",
                  opacity: cacheIndicatorProgress,
                  transform: `scale(${0.8 + 0.2 * cacheIndicatorProgress})`,
                }}
              >
                <div
                  style={{
                    width: 120,
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${COLORS.cyan}60, transparent)`,
                  }}
                />
                <div
                  style={{
                    padding: "4px 16px",
                    borderRadius: 20,
                    background: `${COLORS.cyan}15`,
                    border: `1px solid ${COLORS.cyan}40`,
                    fontSize: 13,
                    fontWeight: 700,
                    color: COLORS.cyan,
                    fontFamily: "JetBrains Mono, monospace",
                    whiteSpace: "nowrap",
                  }}
                >
                  KV Cache: 10x cheaper
                </div>
                <div
                  style={{
                    width: 120,
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${COLORS.cyan}60, transparent)`,
                  }}
                />
              </div>
            )}

            {/* Layer card */}
            <div
              style={{
                transform: `scale(${layerProgress}) translateY(${(1 - layerProgress) * 30}px)`,
                opacity: layerProgress,
                marginBottom: 8,
              }}
            >
              <GlassmorphismCardCore
                width={700}
                height={72}
                progress={layerProgress}
                color={borderColor}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    height: "100%",
                    marginTop: -16,
                  }}
                >
                  {/* Color indicator */}
                  <div
                    style={{
                      width: 6,
                      height: 40,
                      borderRadius: 3,
                      background: layer.color,
                      boxShadow: `0 0 12px ${layer.color}60`,
                      flexShrink: 0,
                    }}
                  />

                  {/* Label and description */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {layer.label}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: COLORS.textMuted,
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {layer.description}
                    </div>
                  </div>

                  {/* Badge */}
                  <div
                    style={{
                      padding: "4px 14px",
                      borderRadius: 12,
                      background: `${badgeColor}15`,
                      border: `1px solid ${badgeColor}50`,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1.2,
                      color: badgeColor,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {badgeLabel}
                  </div>
                </div>
              </GlassmorphismCardCore>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
};
