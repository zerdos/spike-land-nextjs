import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { stagger } from "../../lib/animations";
import { COLORS, SPRING_CONFIGS, TYPOGRAPHY } from "../../lib/constants";

type GitHubSyncFlowProps = {
  delay?: number;
};

const FLOW_NODES = [
  { label: "BridgeMind", color: COLORS.cyan },
  { label: "GitHub Issues", color: COLORS.purple },
  { label: "GitHub Projects", color: COLORS.success },
];

export function GitHubSyncFlow({ delay = 0 }: GitHubSyncFlowProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const boxWidth = 200;
  const boxHeight = 70;
  const arrowGap = 100;
  const totalWidth = FLOW_NODES.length * boxWidth + (FLOW_NODES.length - 1) * arrowGap;
  const startX = (960 - totalWidth) / 2;

  return (
    <div
      style={{
        position: "relative",
        width: 960,
        height: 200,
        display: "flex",
        alignItems: "center",
      }}
    >
      {FLOW_NODES.map((node, index) => {
        const nodeDelay = delay + stagger(index, 12);
        const nodeProgress = spring({
          frame: frame - nodeDelay,
          fps,
          config: SPRING_CONFIGS.snappy,
        });

        const x = startX + index * (boxWidth + arrowGap);

        return (
          <div key={node.label}>
            {/* Node Box */}
            <div
              style={{
                position: "absolute",
                left: x,
                top: 65,
                width: boxWidth,
                height: boxHeight,
                borderRadius: 14,
                background: `${node.color}12`,
                border: `2px solid ${node.color}70`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${nodeProgress})`,
                opacity: nodeProgress,
                boxShadow: `0 4px 24px ${node.color}20`,
              }}
            >
              <span
                style={{
                  fontSize: TYPOGRAPHY.fontSize.lg,
                  fontWeight: 700,
                  color: node.color,
                  fontFamily: TYPOGRAPHY.fontFamily.sans,
                }}
              >
                {node.label}
              </span>
            </div>

            {/* Arrow to next */}
            {index < FLOW_NODES.length - 1 && (() => {
              const arrowDelay = delay + stagger(index, 12) + 8;
              // Animate the dash offset to create flow effect
              const arrowProgress = spring({
                frame: frame - arrowDelay,
                fps,
                config: SPRING_CONFIGS.gentle,
              });
              const dashFill = interpolate(
                arrowProgress,
                [0, 1],
                [arrowGap, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );

              return (
                <div
                  style={{
                    position: "absolute",
                    left: x + boxWidth,
                    top: 92,
                    width: arrowGap,
                    height: 16,
                    opacity: arrowProgress,
                  }}
                >
                  <svg width={arrowGap} height="16" viewBox={`0 0 ${arrowGap} 16`}>
                    <line
                      x1="8"
                      y1="8"
                      x2={arrowGap - 14}
                      y2="8"
                      stroke={COLORS.textMuted}
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      strokeDashoffset={dashFill}
                    />
                    <polygon
                      points={`${arrowGap - 14},3 ${arrowGap - 4},8 ${arrowGap - 14},13`}
                      fill={COLORS.textMuted}
                    />
                  </svg>
                </div>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}
