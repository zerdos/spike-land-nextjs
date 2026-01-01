"use client";
import { ContactShadows, Environment } from "@react-three/drei";

export function TableLighting() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow={false} />
      <ContactShadows resolution={512} scale={20} blur={2} opacity={0.5} far={1} color="#000000" />
      <Environment preset="city" />
    </>
  );
}
