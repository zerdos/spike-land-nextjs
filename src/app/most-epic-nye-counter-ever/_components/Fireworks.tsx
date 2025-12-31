"use client";

import { useCallback, useEffect, useState } from "react";

interface Firework {
  id: number;
  x: number;
  y: number;
  color: string;
}

const COLORS = ["#00E5FF", "#FFD700", "#FF00FF", "#00FF00", "#FFFFFF"];

/**
 * Fireworks system that launches random explosions.
 * Features a high-frequency "celebration" mode for midnight.
 */
export default function Fireworks({ isActive = false }: { isActive?: boolean; }) {
  const [fireworks, setFireworks] = useState<Firework[]>([]);

  const launch = useCallback(() => {
    const newFirework: Firework = {
      id: Date.now() + Math.random(),
      x: 10 + Math.random() * 80, // 10% to 90% width
      y: 10 + Math.random() * 60, // 10% to 70% height
      color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#FFFFFF",
    };

    setFireworks((prev) => [...prev, newFirework]);

    // Cleanup after animation
    setTimeout(() => {
      setFireworks((prev) => prev.filter((fw) => fw.id !== newFirework.id));
    }, 1500);
  }, []);

  // Random launches
  useEffect(() => {
    const interval = isActive ? 500 : 2000 + Math.random() * 3000;
    const timer = setInterval(() => {
      launch();
    }, interval);

    return () => clearInterval(timer);
  }, [isActive, launch]);

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {fireworks.map((fw) => (
        <div
          key={fw.id}
          className="absolute flex items-center justify-center"
          style={{ left: `${fw.x}%`, top: `${fw.y}%` }}
        >
          {/* Central Burst */}
          <div
            className="h-1 w-1 rounded-full animate-firework-burst"
            style={{
              backgroundColor: fw.color,
              boxShadow: `0 0 40px 10px ${fw.color}`,
            }}
          />

          {/* Particles */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 rounded-full animate-firework-burst"
              style={{
                backgroundColor: fw.color,
                boxShadow: `0 0 10px ${fw.color}`,
                transform: `rotate(${i * 30}deg) translateY(-40px)`,
                animationDelay: `${Math.random() * 0.2}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
