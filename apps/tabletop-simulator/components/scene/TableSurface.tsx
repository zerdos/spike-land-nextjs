"use client";
import { RigidBody } from "@react-three/rapier";

export function TableSurface() {
  return (
    <RigidBody type="fixed" friction={0.7} restitution={0.2} colliders="cuboid">
      {/* Table Top */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <boxGeometry args={[12, 12, 0.1]} />
        <meshStandardMaterial color="#0b6e4f" roughness={0.8} />
      </mesh>

      {/* Invisible walls to keep dice on table */}
      <RigidBody type="fixed">
        <cuboidCollider args={[6, 1, 0.1]} position={[0, 1, -6]} />
        <cuboidCollider args={[6, 1, 0.1]} position={[0, 1, 6]} />
        <cuboidCollider args={[0.1, 1, 6]} position={[-6, 1, 0]} />
        <cuboidCollider args={[0.1, 1, 6]} position={[6, 1, 0]} />
      </RigidBody>
    </RigidBody>
  );
}
