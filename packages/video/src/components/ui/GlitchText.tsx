import { interpolate, useCurrentFrame } from "remotion";
import { glitchOffset } from "../../lib/animations";
import { COLORS } from "../../lib/constants";

type GlitchTextProps = {
  text: string;
  fontSize?: number;
  color?: string;
  glitchIntensity?: number;
  isGlitching?: boolean;
  delay?: number;
};

export function GlitchText({
  text,
  fontSize = 48,
  color = COLORS.textPrimary,
  glitchIntensity = 5,
  isGlitching = false,
  delay = 0,
}: GlitchTextProps) {
  const frame = useCurrentFrame();

  const adjustedFrame = frame - delay;

  if (!isGlitching) {
    return (
      <div
        style={{
          fontSize,
          fontWeight: 700,
          color,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {text}
      </div>
    );
  }

  // RGB split offsets
  const redOffset = glitchOffset(adjustedFrame, glitchIntensity, 0);
  const blueOffset = glitchOffset(adjustedFrame, glitchIntensity, 50);

  // Random character scramble
  const scrambleChance = interpolate(
    Math.sin(adjustedFrame * 0.5),
    [-1, 1],
    [0, 0.3],
  );

  const scrambleChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const scrambledText = text
    .split("")
    .map((char) => {
      if (Math.random() < scrambleChance && char !== " ") {
        return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
      }
      return char;
    })
    .join("");

  return (
    <div
      style={{
        position: "relative",
        fontSize,
        fontWeight: 700,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Red channel */}
      <div
        style={{
          position: "absolute",
          color: "#ff0000",
          mixBlendMode: "screen",
          transform: `translate(${redOffset}px, ${redOffset * 0.3}px)`,
          opacity: 0.8,
        }}
      >
        {scrambledText}
      </div>

      {/* Blue channel */}
      <div
        style={{
          position: "absolute",
          color: "#0000ff",
          mixBlendMode: "screen",
          transform: `translate(${blueOffset}px, ${blueOffset * -0.3}px)`,
          opacity: 0.8,
        }}
      >
        {scrambledText}
      </div>

      {/* Main text (green channel) */}
      <div
        style={{
          position: "relative",
          color: "#00ff00",
          mixBlendMode: "screen",
        }}
      >
        {scrambledText}
      </div>
    </div>
  );
}

type TextMorphProps = {
  fromText: string;
  toText: string;
  progress: number; // 0-1
  fontSize?: number;
  color?: string;
};

export function TextMorph({
  fromText,
  toText,
  progress,
  fontSize = 48,
  color = COLORS.textPrimary,
}: TextMorphProps) {
  // During transition, show scrambled characters
  const isTransitioning = progress > 0 && progress < 1;

  if (!isTransitioning) {
    const displayText = progress < 0.5 ? fromText : toText;
    return (
      <div
        style={{
          fontSize,
          fontWeight: 700,
          color,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {displayText}
      </div>
    );
  }

  // Calculate which characters have transitioned
  const maxLength = Math.max(fromText.length, toText.length);
  const transitionedChars = Math.floor(progress * maxLength);

  const scrambleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  const displayChars = [];
  for (let i = 0; i < maxLength; i++) {
    if (i < transitionedChars) {
      // Show target character
      displayChars.push(toText[i] || "");
    } else if (i === transitionedChars) {
      // Show scrambling character
      displayChars.push(
        scrambleChars[Math.floor(Math.random() * scrambleChars.length)],
      );
    } else {
      // Show source character
      displayChars.push(fromText[i] || "");
    }
  }

  return (
    <div
      style={{
        fontSize,
        fontWeight: 700,
        color,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {displayChars.join("")}
    </div>
  );
}
