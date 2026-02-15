import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { stagger } from "../../lib/animations";
import { COLORS, SPRING_CONFIGS, TYPOGRAPHY } from "../../lib/constants";

type BridgeMindBoardViewProps = {
  delay?: number;
};

type TicketData = {
  title: string;
  status: "backlog" | "progress" | "done";
};

const COLUMNS: Array<{
  name: string;
  color: string;
  tickets: TicketData[];
}> = [
  {
    name: "Backlog",
    color: COLORS.textMuted,
    tickets: [
      { title: "/games/tetris", status: "backlog" },
      { title: "/tools/calculator", status: "backlog" },
      { title: "/apps/weather", status: "backlog" },
    ],
  },
  {
    name: "In Progress",
    color: COLORS.amber,
    tickets: [
      { title: "/blog/ai-agents", status: "progress" },
      { title: "/dashboard/analytics", status: "progress" },
    ],
  },
  {
    name: "Done",
    color: COLORS.success,
    tickets: [
      { title: "/landing/signup", status: "done" },
    ],
  },
];

export function BridgeMindBoardView({ delay = 0 }: BridgeMindBoardViewProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let globalTicketIndex = 0;

  return (
    <div
      style={{
        display: "flex",
        gap: 20,
        padding: 24,
        width: 900,
      }}
    >
      {COLUMNS.map((column, colIndex) => {
        const colDelay = delay + stagger(colIndex, 10);
        const colProgress = spring({
          frame: frame - colDelay,
          fps,
          config: SPRING_CONFIGS.snappy,
        });

        return (
          <div
            key={column.name}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              opacity: colProgress,
              transform: `translateY(${(1 - colProgress) * 30}px)`,
            }}
          >
            {/* Column Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderBottom: `2px solid ${column.color}`,
              }}
            >
              <span
                style={{
                  fontSize: TYPOGRAPHY.fontSize.base,
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  fontFamily: TYPOGRAPHY.fontFamily.sans,
                }}
              >
                {column.name}
              </span>
              <span
                style={{
                  fontSize: TYPOGRAPHY.fontSize.xs,
                  color: COLORS.textMuted,
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                  background: `${COLORS.darkBorder}`,
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                {column.tickets.length}
              </span>
            </div>

            {/* Tickets */}
            {column.tickets.map((ticket) => {
              const ticketIdx = globalTicketIndex++;
              const ticketDelay = delay + 10 + stagger(ticketIdx, 6);
              const ticketProgress = spring({
                frame: frame - ticketDelay,
                fps,
                config: SPRING_CONFIGS.gentle,
              });

              return (
                <div
                  key={ticket.title}
                  style={{
                    padding: "12px 16px",
                    background: COLORS.darkCard,
                    border: `1px solid ${COLORS.darkBorder}`,
                    borderRadius: 10,
                    transform: `scale(${ticketProgress})`,
                    opacity: ticketProgress,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: TYPOGRAPHY.fontSize.sm,
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      fontFamily: TYPOGRAPHY.fontFamily.mono,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ticket.title}
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignSelf: "flex-start",
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: `${column.color}20`,
                      border: `1px solid ${column.color}40`,
                      fontSize: TYPOGRAPHY.fontSize.xs,
                      color: column.color,
                      fontFamily: TYPOGRAPHY.fontFamily.sans,
                      fontWeight: 500,
                    }}
                  >
                    {column.name}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
