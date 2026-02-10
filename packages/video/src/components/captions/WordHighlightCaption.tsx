import React from "react";
import { COLORS } from "../../lib/constants";
import { useFormat, formatValue } from "../../lib/format-context";

type Word = {
  text: string;
  start_time: number;
  end_time: number;
};

type WordHighlightCaptionProps = {
  words: Word[];
  currentTime: number; // in seconds
};

export const WordHighlightCaption: React.FC<WordHighlightCaptionProps> = ({
  words,
  currentTime,
}) => {
  const format = useFormat();
  
  const bottomPosition = formatValue(format, {
    landscape: 80,
    portrait: 200,
    square: 100,
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: bottomPosition,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        padding: "0 40px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 1200,
          fontSize: formatValue(format, { landscape: 48, portrait: 64, square: 54 }),
          fontWeight: 800,
          lineHeight: 1.2,
          fontFamily: "Inter, sans-serif",
          color: "white",
          textShadow: "0 2px 10px rgba(0,0,0,0.5)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.2em",
        }}
      >
        {words.map((word, i) => {
          const isActive = currentTime >= word.start_time && currentTime <= word.end_time;
          
          return (
            <span
              key={i}
              style={{
                color: isActive ? COLORS.bridgemindCyan : "white",
                transition: "color 0.1s ease",
                transform: isActive ? "scale(1.05)" : "scale(1)",
                display: "inline-block",
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
