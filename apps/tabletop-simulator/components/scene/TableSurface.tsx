"use client";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";

// Create a procedural felt texture using canvas
function createFeltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // Base felt color - rich green
  ctx.fillStyle = "#0d5c3f";
  ctx.fillRect(0, 0, 512, 512);

  // Add subtle radial gradient for depth
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 400);
  gradient.addColorStop(0, "rgba(26, 100, 70, 0.3)");
  gradient.addColorStop(0.5, "rgba(13, 92, 63, 0.1)");
  gradient.addColorStop(1, "rgba(8, 60, 40, 0.4)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Add felt noise texture
  for (let i = 0; i < 30000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const brightness = Math.random() * 0.15;
    const alpha = Math.random() * 0.3;
    ctx.fillStyle = `rgba(${brightness > 0.075 ? 60 : 30}, ${brightness > 0.075 ? 120 : 80}, ${
      brightness > 0.075 ? 90 : 60
    }, ${alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Add subtle fabric weave pattern
  ctx.strokeStyle = "rgba(20, 80, 55, 0.1)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 512; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;

  return texture;
}

export function TableSurface() {
  // Create felt texture once and memoize
  const feltTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createFeltTexture();
  }, []);

  return (
    <RigidBody type="fixed" friction={0.7} restitution={0.2} colliders={false}>
      {/* Table Top with felt texture */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <boxGeometry args={[12, 12, 0.1]} />
        <meshStandardMaterial
          color="#0b6e4f"
          roughness={0.9}
          metalness={0}
          map={feltTexture}
        />
      </mesh>

      {/* Decorative table edge/border - wooden rim */}
      <mesh position={[0, -0.03, -6.05]} receiveShadow>
        <boxGeometry args={[12.2, 0.15, 0.15]} />
        <meshStandardMaterial color="#4a3728" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.03, 6.05]} receiveShadow>
        <boxGeometry args={[12.2, 0.15, 0.15]} />
        <meshStandardMaterial color="#4a3728" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[-6.05, -0.03, 0]} receiveShadow>
        <boxGeometry args={[0.15, 0.15, 12]} />
        <meshStandardMaterial color="#4a3728" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[6.05, -0.03, 0]} receiveShadow>
        <boxGeometry args={[0.15, 0.15, 12]} />
        <meshStandardMaterial color="#4a3728" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Table surface collider */}
      <CuboidCollider args={[6, 0.05, 6]} position={[0, -0.05, 0]} />

      {/* Invisible walls to keep dice on table */}
      <CuboidCollider args={[6, 1, 0.1]} position={[0, 1, -6]} />
      <CuboidCollider args={[6, 1, 0.1]} position={[0, 1, 6]} />
      <CuboidCollider args={[0.1, 1, 6]} position={[-6, 1, 0]} />
      <CuboidCollider args={[0.1, 1, 6]} position={[6, 1, 0]} />
    </RigidBody>
  );
}
