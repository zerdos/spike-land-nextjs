import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VibePulseProps {
  codeSpace?: string;
  size?: "sm" | "md" | "lg";
  showVitals?: boolean;
}

interface VersionInfo {
  number: number;
  hash: string;
  createdAt: number;
}

const SIZES: Record<string, number> = { sm: 64, md: 140, lg: 220 };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function getCodeSpaceFromUrl(): string {
  if (typeof window === "undefined") return "vibe-pulse";
  const match = window.location.pathname.match(/^\/live\/([^/]+)/);
  return match ? match[1] : "vibe-pulse";
}

export default function VibePulse({
  codeSpace,
  size = "lg",
  showVitals = true,
}: VibePulseProps) {
  const resolvedCodeSpace = codeSpace || getCodeSpaceFromUrl();
  const dim = SIZES[size] || SIZES.lg;

  const [versionCount, setVersionCount] = useState(0);
  const [codeLines, setCodeLines] = useState(0);
  const [lastEdit, setLastEdit] = useState<number | null>(null);
  const [editVelocity, setEditVelocity] = useState(0);
  const [particles, setParticles] = useState<
    Array<{ id: number; angle: number }>
  >([]);
  const prevCountRef = useRef(0);
  const pidRef = useRef(0);

  // Fetch session for line count
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/live/${resolvedCodeSpace}/session.json`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.code) setCodeLines(data.code.split("\n").length);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedCodeSpace]);

  // Poll versions for velocity + last edit
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/live/${resolvedCodeSpace}/versions`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const vers: VersionInfo[] = data.versions || [];
        setVersionCount(vers.length);

        if (vers.length > 0) {
          const sorted = [...vers].sort((a, b) => a.createdAt - b.createdAt);
          setLastEdit(sorted[sorted.length - 1].createdAt);

          const fiveMinAgo = Date.now() - 5 * 60 * 1000;
          const recent = sorted.filter((v) => v.createdAt > fiveMinAgo);
          setEditVelocity(recent.length / 5);
        }

        // Burst particles on new versions
        if (vers.length > prevCountRef.current && prevCountRef.current > 0) {
          const burst = Array.from({ length: 8 }, (_, i) => ({
            id: pidRef.current++,
            angle: (i / 8) * Math.PI * 2,
          }));
          setParticles((prev) => [...prev, ...burst]);
          setTimeout(
            () =>
              setParticles((prev) =>
                prev.filter((p) => !burst.find((b) => b.id === p.id))
              ),
            1000
          );
        }
        prevCountRef.current = vers.length;
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [resolvedCodeSpace]);

  // Activity: 0 = dormant, 1 = hot
  const activity = useMemo(() => {
    if (!lastEdit) return 0;
    const mins = (Date.now() - lastEdit) / 60000;
    if (mins < 1) return 1;
    if (mins < 5) return 0.7;
    if (mins < 30) return 0.4;
    if (mins < 120) return 0.15;
    return 0.05;
  }, [lastEdit]);

  // Hue: 210 (blue/dormant) -> 30 (orange/active) -> 0 (red/hot)
  const hue = useMemo(() => lerp(210, activity > 0.6 ? 0 : 30, activity), [activity]);
  const ringColor = hsl(hue, 75, 55);
  const glowColor = hsl(hue, 75, 30);
  const pulseSpeed = lerp(4, 0.8, activity);
  const borderWidth = Math.max(1, lerp(1, 3, codeLines / 500));

  const rings = [0.4, 0.6, 0.8, 1.0];

  const formatTimeAgo = (ts: number | null) => {
    if (!ts) return "never";
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: size === "sm" ? 2 : 10,
        fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
      }}
    >
      <div style={{ position: "relative", width: dim, height: dim }}>
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${glowColor}33 0%, transparent 70%)`,
          }}
        />

        {/* Concentric rings */}
        {rings.map((scale, i) => {
          const s = dim * scale;
          return (
            <motion.div
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: s,
                height: s,
                marginLeft: -s / 2,
                marginTop: -s / 2,
                borderRadius: "50%",
                border: `${borderWidth}px solid ${ringColor}`,
                opacity: 0.25 + i * 0.15,
              }}
              animate={{
                scale: [1, 1.06, 1],
                opacity: [0.25 + i * 0.15, 0.55 + i * 0.1, 0.25 + i * 0.15],
              }}
              transition={{
                duration: pulseSpeed,
                repeat: Infinity,
                delay: i * (pulseSpeed / rings.length),
                ease: "easeInOut",
              }}
            />
          );
        })}

        {/* Center dot */}
        <motion.div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: dim * 0.12,
            height: dim * 0.12,
            marginLeft: -(dim * 0.06),
            marginTop: -(dim * 0.06),
            borderRadius: "50%",
            background: ringColor,
          }}
          animate={{
            scale: [1, 1.3, 1],
            boxShadow: [
              `0 0 ${dim * 0.04}px ${ringColor}88`,
              `0 0 ${dim * 0.12}px ${ringColor}cc`,
              `0 0 ${dim * 0.04}px ${ringColor}88`,
            ],
          }}
          transition={{
            duration: pulseSpeed,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Particles */}
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              style={{
                position: "absolute",
                left: dim / 2,
                top: dim / 2,
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: ringColor,
              }}
              initial={{ opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(p.angle) * dim * 0.55,
                y: Math.sin(p.angle) * dim * 0.55,
                opacity: 0,
                scale: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          ))}
        </AnimatePresence>

        {/* Name label */}
        {size !== "sm" && (
          <div
            style={{
              position: "absolute",
              bottom: dim * 0.12,
              left: 0,
              right: 0,
              textAlign: "center",
              color: ringColor,
              fontSize: Math.max(9, dim * 0.065),
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            {resolvedCodeSpace}
          </div>
        )}
      </div>

      {/* Vitals */}
      {showVitals && (
        <div
          style={{
            display: "flex",
            gap: size === "sm" ? 6 : size === "md" ? 10 : 16,
            fontSize: size === "sm" ? 9 : size === "md" ? 10 : 12,
            color: "#94a3b8",
            opacity: 0.85,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span title="Versions">v{versionCount}</span>
          <span title="Lines of code">{codeLines}L</span>
          <span title="Last edit">{formatTimeAgo(lastEdit)}</span>
          {size !== "sm" && (
            <span
              title="Edit velocity (versions/min)"
              style={{ color: editVelocity > 0.5 ? ringColor : undefined }}
            >
              {editVelocity.toFixed(1)}/m
            </span>
          )}
        </div>
      )}
    </div>
  );
}
