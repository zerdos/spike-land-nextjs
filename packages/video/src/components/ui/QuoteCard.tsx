import React from "react";
import { GlassmorphismCard } from "./GlassmorphismCard";
import { COLORS } from "../../lib/constants";

type QuoteCardProps = {
  quote: string;
  author?: string;
  delay?: number;
  width?: number;
};

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  author,
  delay = 0,
  width = 600,
}) => {
  return (
    <GlassmorphismCard delay={delay} width={width}>
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: -20,
            left: -10,
            fontSize: 80,
            opacity: 0.1,
            fontFamily: "serif",
            color: COLORS.bridgemindCyan,
          }}
        >
          “
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            lineHeight: 1.4,
            background: `linear-gradient(to right, ${COLORS.textPrimary}, ${COLORS.textSecondary})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "Inter, sans-serif",
            position: "relative",
            zIndex: 1,
          }}
        >
          {quote}
        </div>
        {author && (
          <div
            style={{
              marginTop: 24,
              fontSize: 18,
              fontWeight: 500,
              color: COLORS.bridgemindCyan,
              textAlign: "right",
            }}
          >
            — {author}
          </div>
        )}
      </div>
    </GlassmorphismCard>
  );
};
