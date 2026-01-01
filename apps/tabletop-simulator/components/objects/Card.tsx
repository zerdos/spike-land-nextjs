"use client";
import { animated, useSpring } from "@react-spring/three";
import * as THREE from "three";
import { useCardGestures } from "../../hooks/useCardGestures";
import { Card as CardType } from "../../types/card";

interface CardProps {
  card: CardType;
  isOwner: boolean;
  onMove: (id: string, pos: { x: number; y: number; z: number; }) => void;
  onFlip: (id: string) => void;
}

export function Card({ card, isOwner, onMove, onFlip }: CardProps) {
  // Animate position and rotation
  const { position, rotation } = useSpring({
    position: [card.position.x, card.position.y, card.position.z],
    rotation: [card.rotation.x, card.rotation.y, card.rotation.z],
    config: { friction: 30, tension: 120 },
  });

  const bind = useCardGestures(card.id, onMove, onFlip);

  return (
    // @ts-ignore
    <animated.group position={position} rotation={rotation} {...bind()}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.5, 3.5, 0.05]} />
        <meshStandardMaterial color="white" />

        {/* Face (Red for back, White/Texture for front) */}
        {/* Simplification: using color based on faceUp/isOwner */}
        <meshStandardMaterial attach="material-0" color="white" /> {/* side */}
        <meshStandardMaterial attach="material-1" color="white" /> {/* side */}
        <meshStandardMaterial attach="material-2" color="white" /> {/* side */}
        <meshStandardMaterial attach="material-3" color="white" /> {/* side */}
        <meshStandardMaterial
          attach="material-4"
          color={card.faceUp || isOwner ? "#eeeeee" : "#880000"}
        />{" "}
        {/* Front/Top */}
        <meshStandardMaterial
          attach="material-5"
          color="#880000"
        />{" "}
        {/* Back/Bottom */}
      </mesh>
    </animated.group>
  );
}
