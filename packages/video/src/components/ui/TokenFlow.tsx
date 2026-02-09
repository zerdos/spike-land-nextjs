import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

type TokenFlowProps = {
  text: string;
  showConnections?: boolean;
  delay?: number;
};

export function TokenFlow({
  text,
  showConnections = true,
  delay = 0,
}: TokenFlowProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tokens = text.split(" ").filter(t => t.length > 0);
  
  return (
    <div style={{ position: "relative", width: "100%", height: "400px", overflow: "visible" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px",
        }}
      >
        {tokens.map((token, index) => {
          const entrance = spring({
            frame: frame - delay - index * 3,
            fps,
            config: SPRING_CONFIGS.snappy,
          });

          return (
            <div
              key={`${token}-${index}`}
              id={`token-${index}`}
              style={{
                transform: `scale(${entrance})`,
                opacity: entrance,
                padding: "8px 16px",
                backgroundColor: COLORS.darkCard,
                border: `1px solid ${COLORS.cyan}40`,
                borderRadius: "8px",
                color: "white",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 20,
                boxShadow: `0 0 15px ${COLORS.cyan}20`,
                zIndex: 2,
              }}
            >
              {token}
            </div>
          );
        })}
      </div>

      {showConnections && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "visible",
            zIndex: 1,
          }}
        >
          {tokens.map((_, i) => {
            return tokens.slice(i + 1).map((_, j) => {
              const actualJ = i + 1 + j;
              const connectionProgress = spring({
                frame: frame - delay - (i + actualJ) * 2 - 20,
                fps,
                config: SPRING_CONFIGS.smooth,
              });

              if (connectionProgress <= 0) return null;

              // This is a simplification. In a real Remotion component, 
              // we'd use refs or absolute positioning to get exact coordinates.
              // For this visual, we'll draw lines between "theoretical" grid positions.
              return (
                <line
                  key={`line-${i}-${actualJ}`}
                  x1={`${20 + (i % 5) * 15}%`}
                  y1={`${20 + Math.floor(i / 5) * 20}%`}
                  x2={`${20 + (actualJ % 5) * 15}%`}
                  y2={`${20 + Math.floor(actualJ / 5) * 20}%`}
                  stroke={COLORS.cyan}
                  strokeWidth={1}
                  strokeOpacity={0.1 * connectionProgress}
                />
              );
            });
          })}
        </svg>
      )}
    </div>
  );
}
