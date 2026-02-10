import React, { useMemo } from "react";
import { interpolate } from "remotion";
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

const PHRASE_GAP = 0.4; // seconds gap to split into phrases

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

  // Group words into phrases based on timing gaps
  const phrases = useMemo(() => {
    const result: Word[][] = [];
    let current: Word[] = [];

    for (let i = 0; i < words.length; i++) {
      current.push(words[i]);
      const next = words[i + 1];
      if (!next || next.start_time - words[i].end_time > PHRASE_GAP) {
        result.push(current);
        current = [];
      }
    }
    if (current.length > 0) result.push(current);
    return result;
  }, [words]);

  // Find active phrase
  const activePhrase = phrases.find(
    (phrase) =>
      currentTime >= phrase[0].start_time - 0.1 &&
      currentTime <= phrase[phrase.length - 1].end_time + 0.3
  );

  if (!activePhrase) return null;

  // Fade in/out for the phrase
  const phraseStart = activePhrase[0].start_time;
  const phraseEnd = activePhrase[activePhrase.length - 1].end_time;
  const opacity = interpolate(
    currentTime,
    [phraseStart - 0.1, phraseStart, phraseEnd, phraseEnd + 0.3],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

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
        opacity,
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 1200,
          fontSize: formatValue(format, { landscape: 96, portrait: 128, square: 108 }),
          fontWeight: 800,
          lineHeight: 1.2,
          fontFamily: "Inter, sans-serif",
          color: "white",
          textShadow: "0 4px 12px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.2em",
        }}
      >
        {activePhrase.map((word, i) => {
          const isActive = currentTime >= word.start_time && currentTime <= word.end_time;
          const isPast = currentTime > word.end_time;

          return (
            <span
              key={i}
              style={{
                color: isActive ? COLORS.bridgemindCyan : isPast ? "rgba(255,255,255,0.7)" : "white",
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
