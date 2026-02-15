import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { typewriter } from "../../lib/animations";
import { COLORS, SPRING_CONFIGS, TYPOGRAPHY } from "../../lib/constants";

type URLToAppTransitionProps = {
  url?: string;
  delay?: number;
};

export function URLToAppTransition({
  url = "spike.land/games/tetris",
  delay = 0,
}: URLToAppTransitionProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - delay;

  // Phase 1: URL typing (frames 0-40)
  const typedUrl = typewriter(adjustedFrame, fps, url, 25, 0);
  const urlBarOpacity = interpolate(adjustedFrame, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const urlBarFade = interpolate(adjustedFrame, [40, 50], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: Code generation typewriter (frames 35-70)
  const codeSnippet = `export default function Tetris() {
  const [board, setBoard] = useState(createBoard());
  const [score, setScore] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      dropPiece(board, setBoard, setScore);
    }, 500);
    return () => clearInterval(interval);
  }, [board]);

  return <GameBoard board={board} score={score} />;
}`;

  const typedCode = typewriter(adjustedFrame, fps, codeSnippet, 60, 35);
  const codeOpacity = interpolate(adjustedFrame, [35, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const codeFade = interpolate(adjustedFrame, [70, 80], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 3: Live preview (frames 75+)
  const previewProgress = spring({
    frame: adjustedFrame - 75,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  // Cursor blink
  const cursorVisible = Math.floor(adjustedFrame / 8) % 2 === 0;

  return (
    <div
      style={{
        position: "relative",
        width: 700,
        height: 500,
      }}
    >
      {/* Phase 1: URL Bar */}
      {urlBarFade > 0 && (
        <div
          style={{
            position: "absolute",
            top: 180,
            left: 50,
            right: 50,
            opacity: urlBarOpacity * urlBarFade,
          }}
        >
          <div
            style={{
              height: 56,
              background: "rgba(0,0,0,0.4)",
              borderRadius: 12,
              border: `2px solid ${COLORS.cyan}60`,
              display: "flex",
              alignItems: "center",
              padding: "0 20px",
              gap: 12,
              boxShadow: `0 0 30px ${COLORS.cyan}20`,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={COLORS.textMuted}
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span
              style={{
                fontSize: TYPOGRAPHY.fontSize.xl,
                color: COLORS.textPrimary,
                fontFamily: TYPOGRAPHY.fontFamily.mono,
              }}
            >
              {typedUrl}
              {adjustedFrame < 40 && cursorVisible && (
                <span style={{ color: COLORS.cyan }}>|</span>
              )}
            </span>
          </div>
          <div
            style={{
              marginTop: 12,
              textAlign: "center",
              fontSize: TYPOGRAPHY.fontSize.sm,
              color: COLORS.textMuted,
              fontFamily: TYPOGRAPHY.fontFamily.sans,
            }}
          >
            Enter a URL...
          </div>
        </div>
      )}

      {/* Phase 2: Code Generation */}
      {codeOpacity > 0 && codeFade > 0 && (
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 30,
            right: 30,
            opacity: codeOpacity * codeFade,
          }}
        >
          <div
            style={{
              background: COLORS.darkCard,
              border: `1px solid ${COLORS.darkBorder}`,
              borderRadius: 12,
              padding: 20,
              overflow: "hidden",
            }}
          >
            {/* Code editor header */}
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 12,
                paddingBottom: 12,
                borderBottom: `1px solid ${COLORS.darkBorder}`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#ff5f56",
                }}
              />
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#ffbd2e",
                }}
              />
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#27c93f",
                }}
              />
              <span
                style={{
                  marginLeft: 12,
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  color: COLORS.textMuted,
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                }}
              >
                Tetris.tsx
              </span>
            </div>

            <pre
              style={{
                fontSize: TYPOGRAPHY.fontSize.sm,
                color: COLORS.cyan,
                fontFamily: TYPOGRAPHY.fontFamily.mono,
                lineHeight: 1.6,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {typedCode}
              {adjustedFrame >= 35 && adjustedFrame < 70 && cursorVisible && (
                <span style={{ color: COLORS.fuchsia }}>|</span>
              )}
            </pre>
          </div>
        </div>
      )}

      {/* Phase 3: Live Preview */}
      {previewProgress > 0 && (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 100,
            right: 100,
            transform: `scale(${previewProgress})`,
            opacity: previewProgress,
          }}
        >
          <div
            style={{
              background: COLORS.darkBg,
              borderRadius: 16,
              border: `2px solid ${COLORS.success}60`,
              overflow: "hidden",
              boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${COLORS.success}20`,
            }}
          >
            {/* Browser chrome */}
            <div
              style={{
                height: 36,
                background: "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                gap: 12,
                borderBottom: `1px solid ${COLORS.darkBorder}`,
              }}
            >
              <div style={{ display: "flex", gap: 5 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#ff5f56",
                  }}
                />
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#ffbd2e",
                  }}
                />
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#27c93f",
                  }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  height: 22,
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 8px",
                  fontSize: 10,
                  color: COLORS.textMuted,
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                }}
              >
                {url}
              </div>
            </div>

            {/* App preview mockup */}
            <div
              style={{
                height: 300,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                background: `linear-gradient(135deg, ${COLORS.darkBg} 0%, ${COLORS.darkCard} 100%)`,
              }}
            >
              {/* Simple Tetris board mockup */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 24px)",
                  gap: 2,
                }}
              >
                {Array.from({ length: 18 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background:
                        i % 5 === 0 || i === 7 || i === 13
                          ? COLORS.cyan
                          : i % 3 === 0
                            ? `${COLORS.fuchsia}60`
                            : `${COLORS.darkBorder}`,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  fontSize: TYPOGRAPHY.fontSize.lg,
                  fontWeight: 700,
                  color: COLORS.success,
                  fontFamily: TYPOGRAPHY.fontFamily.sans,
                }}
              >
                Live App Running
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
