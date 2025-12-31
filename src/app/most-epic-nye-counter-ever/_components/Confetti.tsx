"use client";

import { useCallback, useEffect, useState } from "react";

interface Piece {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: string;
  rotate: string;
  size: number;
  shape: "rect" | "circle";
}

const COLORS = [
  "#00E5FF", // Cyan
  "#FFD700", // Gold
  "#FF00FF", // Pink
  "#FFFFFF", // White
  "#9D4EDD", // Purple
];

/**
 * Confetti system that triggers on click.
 * Uses CSS animations for efficient particle movement.
 */
export default function Confetti() {
  const [pieces, setPieces] = useState<Piece[]>([]);

  const burst = useCallback((x: number, y: number, count = 40) => {
    const newPieces = Array.from({ length: count }).map((_, i) => ({
      id: Math.random() + i,
      x: x + (Math.random() - 0.5) * 50,
      y: y + (Math.random() - 0.5) * 50,
      color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#FFFFFF",
      delay: `${Math.random() * 0.2}s`,
      rotate: `${Math.random() * 360}deg`,
      size: Math.random() * 8 + 4,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    } as Piece));

    setPieces((prev) => [...prev, ...newPieces]);

    // Cleanup after animation (approx 3s)
    setTimeout(() => {
      setPieces((prev) => prev.filter((p) => !newPieces.includes(p)));
    }, 4000);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      burst(e.clientX, e.clientY);
    };

    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [burst]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className={`absolute animate-confetti-fall ${
            p.shape === "circle" ? "rounded-full" : "rounded-sm"
          }`}
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: p.shape === "rect" ? `${p.size * 0.6}px` : `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: p.delay,
            transform: `rotate(${p.rotate})`,
            boxShadow: `0 0 5px ${p.color}88`,
          }}
        />
      ))}
    </div>
  );
}
