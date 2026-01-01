"use client";

interface DeckProps {
  count: number;
  onDraw: () => void;
  onShuffle: () => void;
}

export function Deck({ count, onDraw, onShuffle }: DeckProps) {
  // Stack height grows with card count
  const stackHeight = Math.max(0.1, count * 0.005);

  return (
    <group position={[0, 0.1, 0]}>
      {count > 0 && (
        <mesh
          onClick={onDraw}
          onContextMenu={(e) => {
            e.stopPropagation();
            onShuffle();
          }}
          castShadow
          receiveShadow
          position={[0, stackHeight / 2, 0]}
        >
          <boxGeometry args={[1.5, stackHeight, 2]} />
          <meshStandardMaterial color="#1a4a8a" />
        </mesh>
      )}
      {/* Card count indicator on top */}
      <mesh position={[0, stackHeight + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}
