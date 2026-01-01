"use client";
import { Text } from "@react-three/drei";

interface DeckProps {
  count: number;
  onDraw: () => void;
  onShuffle: () => void;
}

export function Deck({ count, onDraw, onShuffle }: DeckProps) {
  return (
    <group position={[6, 0.1, 0]}>
      {count > 0 && (
        <mesh onClick={onDraw} castShadow receiveShadow>
          <boxGeometry args={[2.5, 3.5 + (count * 0.01), 0.05]} />
          <meshStandardMaterial color="#880000" />
        </mesh>
      )}
      <Text
        position={[0, 4, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        color="white"
        onClick={onShuffle}
      >
        Shuffle ({count})
      </Text>
    </group>
  );
}
