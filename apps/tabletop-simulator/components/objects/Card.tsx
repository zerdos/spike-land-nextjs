"use client";
import { animated, useSpring } from "@react-spring/three";
import { Html } from "@react-three/drei";
import { memo, useMemo } from "react";
import { useCardGestures } from "../../hooks/useCardGestures";
import { Card as CardType, Suit } from "../../types/card";

interface CardProps {
  card: CardType;
  isOwner: boolean;
  onMove: (id: string, pos: { x: number; y: number; z: number; }) => void;
  onFlip: (id: string) => void;
}

// Suit info lookup table (static, no function call needed)
const SUIT_INFO: Record<Suit, { symbol: string; color: string; }> = {
  hearts: { symbol: "♥", color: "#e53935" },
  diamonds: { symbol: "♦", color: "#e53935" },
  clubs: { symbol: "♣", color: "#212121" },
  spades: { symbol: "♠", color: "#212121" },
};

// Memoized card face component to reduce re-renders
const CardFace = memo(function CardFace(
  { rank, suit, color }: { rank: string; suit: string; color: string; },
) {
  return (
    <div
      style={{
        fontSize: "24px",
        fontWeight: "bold",
        fontFamily: "serif",
        color,
        textAlign: "center",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ fontSize: "32px" }}>{rank}</div>
      <div style={{ fontSize: "28px" }}>{suit}</div>
    </div>
  );
});

// Memoized card back component
const CardBack = memo(function CardBack() {
  return (
    <div
      style={{
        fontSize: "16px",
        color: "#ffcc00",
        textAlign: "center",
        userSelect: "none",
      }}
    >
      ✦
    </div>
  );
});

export function Card({ card, isOwner, onMove, onFlip }: CardProps) {
  // Animate position and rotation with optimized config
  const { position, rotation } = useSpring({
    position: [card.position.x, card.position.y, card.position.z],
    rotation: [card.rotation.x, card.rotation.y, card.rotation.z],
    config: { friction: 30, tension: 120, precision: 0.01 },
  });

  const bind = useCardGestures(card.id, onMove, onFlip);
  const gestureHandlers = bind();

  const showFace = card.faceUp || isOwner;
  const suitInfo = SUIT_INFO[card.suit];

  // Memoize static Html props to prevent re-creation
  const htmlProps = useMemo(() => ({
    position: [0, 0, 0.03] as [number, number, number],
    center: true,
    distanceFactor: 8,
    style: { pointerEvents: "none" as const },
    occlude: false, // Disable occlusion for better performance
    transform: true, // Use CSS transforms for better performance
  }), []);

  return (
    <animated.group
      position={position as unknown as [number, number, number]}
      rotation={rotation as unknown as [number, number, number]}
      {...(gestureHandlers as Record<string, unknown>)}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.5, 3.5, 0.05]} />
        {/* Card sides */}
        <meshStandardMaterial attach="material-0" color="white" />
        <meshStandardMaterial attach="material-1" color="white" />
        <meshStandardMaterial attach="material-2" color="white" />
        <meshStandardMaterial attach="material-3" color="white" />
        {/* Front face */}
        <meshStandardMaterial
          attach="material-4"
          color={showFace ? "#fafafa" : "#880000"}
        />
        {/* Back face */}
        <meshStandardMaterial attach="material-5" color="#880000" />
      </mesh>

      {/* Card face label - only show if face up or owner */}
      {showFace && (
        <Html {...htmlProps}>
          <CardFace rank={card.rank} suit={suitInfo.symbol} color={suitInfo.color} />
        </Html>
      )}

      {/* Back pattern - show when face down */}
      {!showFace && (
        <Html {...htmlProps}>
          <CardBack />
        </Html>
      )}
    </animated.group>
  );
}
