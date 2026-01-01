"use client";
import { animated, useSpring } from "@react-spring/three";
import { Html } from "@react-three/drei";
import { useCardGestures } from "../../hooks/useCardGestures";
import { Card as CardType, Suit } from "../../types/card";

interface CardProps {
  card: CardType;
  isOwner: boolean;
  onMove: (id: string, pos: { x: number; y: number; z: number; }) => void;
  onFlip: (id: string) => void;
}

// Get suit symbol and color
function getSuitInfo(suit: Suit): { symbol: string; color: string; } {
  switch (suit) {
    case "hearts":
      return { symbol: "♥", color: "#e53935" };
    case "diamonds":
      return { symbol: "♦", color: "#e53935" };
    case "clubs":
      return { symbol: "♣", color: "#212121" };
    case "spades":
      return { symbol: "♠", color: "#212121" };
  }
}

export function Card({ card, isOwner, onMove, onFlip }: CardProps) {
  // Animate position and rotation
  const { position, rotation } = useSpring({
    position: [card.position.x, card.position.y, card.position.z],
    rotation: [card.rotation.x, card.rotation.y, card.rotation.z],
    config: { friction: 30, tension: 120 },
  });

  const bind = useCardGestures(card.id, onMove, onFlip);
  const gestureHandlers = bind();

  const showFace = card.faceUp || isOwner;
  const suitInfo = getSuitInfo(card.suit);

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
        <Html
          position={[0, 0, 0.03]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              fontFamily: "serif",
              color: suitInfo.color,
              textAlign: "center",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ fontSize: "32px" }}>{card.rank}</div>
            <div style={{ fontSize: "28px" }}>{suitInfo.symbol}</div>
          </div>
        </Html>
      )}

      {/* Back pattern - show when face down */}
      {!showFace && (
        <Html
          position={[0, 0, 0.03]}
          center
          distanceFactor={8}
          style={{ pointerEvents: "none" }}
        >
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
        </Html>
      )}
    </animated.group>
  );
}
