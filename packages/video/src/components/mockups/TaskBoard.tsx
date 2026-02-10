import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../../lib/constants";

type Task = {
  id: string;
  title: string;
  type: "feat" | "bug" | "docs";
};

export const TaskBoard: React.FC = () => {
  const _frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  const columns = ["Pending", "In Progress", "Done"];
  const tasks: Task[] = [
    { id: "1", title: "Implement MCP Bridge", type: "feat" },
    { id: "2", title: "Fix Context Leak", type: "bug" },
    { id: "3", title: "Add Auth Docs", type: "docs" },
    { id: "4", title: "Voice Agent SDK", type: "feat" },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 20,
        height: "100%",
        padding: 40,
        background: "rgba(0,0,0,0.2)",
      }}
    >
      {columns.map((column, i) => {
        return (
          <div
            key={column}
            style={{
              flex: 1,
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: 16,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              border: `1px solid ${COLORS.darkBorder}`,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 10,
              }}
            >
              {column}
            </div>

            {/* Render cards selectively for animation demonstration */}
            {i === 1 && (
              <TaskCard
                task={tasks[0]}
                delay={30}
                color={COLORS.bridgemindCyan}
                animOffset={-20}
              />
            )}
            
            {i === 0 && (
              <>
                <TaskCard task={tasks[1]} delay={45} color={COLORS.error} />
                <TaskCard task={tasks[2]} delay={60} color={COLORS.success} />
              </>
            )}

            {i === 2 && (
              <TaskCard task={tasks[3]} delay={90} color={COLORS.bridgemindPink} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const TaskCard: React.FC<{ task: Task; delay: number; color: string; animOffset?: number }> = ({
  task,
  delay,
  color,
  animOffset = 0
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: SPRING_CONFIGS.snappy,
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const y = interpolate(progress, [0, 1], [20 + animOffset, animOffset]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        background: COLORS.darkCard,
        borderRadius: 12,
        padding: "16px",
        border: `1px solid ${COLORS.darkBorder}`,
        borderLeft: `4px solid ${color}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8, fontWeight: 700 }}>
        #{task.id} • {task.type.toUpperCase()}
      </div>
      <div style={{ fontSize: 16, color: COLORS.textPrimary, fontWeight: 600 }}>{task.title}</div>
    </div>
  );
};
