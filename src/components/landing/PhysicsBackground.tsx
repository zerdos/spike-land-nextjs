"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { useScroll } from "framer-motion";
import { useMemo, useRef, useState, useEffect } from "react";

function FloatingOrb({ position, scale, color }: { position: [number, number, number], scale: number, color: string }) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const { scrollYProgress } = useScroll();
  
  useFrame((state) => {
    if (!rigidBodyRef.current) return;
    
    // Apply a light upward force to simulate buoyancy
    rigidBodyRef.current.applyImpulse({ x: 0, y: 0.08 * scale, z: 0 }, true);
    
    // Add some random horizontal movement
    const t = state.clock.getElapsedTime();
    rigidBodyRef.current.applyImpulse({ 
      x: Math.sin(t * 2 + position[0]) * 0.05, 
      y: Math.cos(t * 1.5 + position[1]) * 0.05, 
      z: Math.cos(t * 2 + position[2]) * 0.05 
    }, true);

    // React to scroll
    const scrollEffect = scrollYProgress.get() * 10;
    rigidBodyRef.current.applyImpulse({ x: 0, y: scrollEffect * 0.1, z: 0 }, true);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      colliders="ball"
      restitution={1}
      friction={0}
      linearDamping={0.5}
      angularDamping={0.5}
    >
      <mesh scale={scale}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={0.5} 
          roughness={0} 
          metalness={1}
          transparent
          opacity={0.6}
        />
      </mesh>
    </RigidBody>
  );
}

function Scene() {
  const orbs = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 25,
        Math.random() * 20 - 10,
        (Math.random() - 0.5) * 15,
      ] as [number, number, number],
      scale: Math.random() * 0.8 + 0.3,
      // Neon/Cyberpunk palette
      color: [
        "#06b6d4", // Cyan
        "#d946ef", // Fuchsia
        "#8b5cf6", // Violet
        "#f43f5e", // Rose
        "#10b981", // Emerald
      ][Math.floor(Math.random() * 5)] as string,
    }));
  }, []);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Physics gravity={[0, -1, 0]}>
        {orbs.map((orb) => (
          <FloatingOrb key={orb.id} {...orb} />
        ))}
        {/* Bounds to keep orbs in view */}
        <CuboidCollider position={[0, -10, 0]} args={[20, 1, 10]} />
        <CuboidCollider position={[0, 20, 0]} args={[20, 1, 10]} />
        <CuboidCollider position={[-15, 0, 0]} args={[1, 20, 10]} />
        <CuboidCollider position={[15, 0, 0]} args={[1, 20, 10]} />
      </Physics>
    </>
  );
}

export function PhysicsBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 bg-zinc-950">
      <Canvas
        shadows
        camera={{ position: [0, 0, 15], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/20 to-zinc-950 pointer-events-none" />
    </div>
  );
}
