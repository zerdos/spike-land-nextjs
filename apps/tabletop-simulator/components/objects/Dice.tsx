"use client";
import { RigidBody } from "@react-three/rapier";
import { useDicePhysics } from "../../hooks/useDicePhysics";
import { DiceState } from "../../types/dice";

interface DiceProps {
  state: DiceState;
  onSettle: (id: string, value: number) => void;
}

export function Dice({ state, onSettle }: DiceProps) {
  const { rigidBodyRef } = useDicePhysics(state, onSettle);

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[state.position.x, state.position.y, state.position.z]}
      colliders="hull"
      restitution={0.5}
      friction={0.5}
    >
      <mesh castShadow>
        {/* Simple Box for MVP, ideally specific polyhedrons */}
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#aa2222" roughness={0.2} />
      </mesh>
    </RigidBody>
  );
}
