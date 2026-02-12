import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import VibePulse from "/live/vibe-pulse";

interface VibeCanvasProps {
  codeSpaces?: string[];
  width?: number | string;
  height?: number | string;
  onCardSelect?: (codeSpace: string) => void;
}

interface CardData {
  codeSpace: string;
  x: number;
  y: number;
  imports: string[];
}

const CARD_W = 260;
const CARD_H = 200;
const THUMB_SCALE = 0.14;
const BG = "#0a0f1a";
const BORDER = "#1e293b";
const ACCENT = "#3b82f6";
const TEXT = "#e2e8f0";
const MUTED = "#64748b";

const DEFAULT_SPACES = ["vibe-pulse", "vibe-timeline", "vibe-canvas", "vibe-nexus"];

function extractImports(code: string): string[] {
  const re = /from\s+["']\/live\/([^"'/]+)["']/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) out.push(m[1]);
  return out;
}

export default function VibeCanvas({
  codeSpaces,
  width,
  height,
  onCardSelect,
}: VibeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resolved = codeSpaces || DEFAULT_SPACES;
  const resolvedKey = resolved.join(",");

  const [cards, setCards] = useState<CardData[]>([]);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Fetch sessions, build card graph
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cols = Math.ceil(Math.sqrt(resolved.length));
      const results: CardData[] = [];

      for (let i = 0; i < resolved.length; i++) {
        const cs = resolved[i];
        let imports: string[] = [];
        try {
          const res = await fetch(`/live/${cs}/session.json`);
          if (res.ok) {
            const data = await res.json();
            imports = extractImports(data.code || "");
          }
        } catch {
          /* ignore */
        }
        const col = i % cols;
        const row = Math.floor(i / cols);
        results.push({
          codeSpace: cs,
          x: col * (CARD_W + 60) + 40,
          y: row * (CARD_H + 60) + 40,
          imports,
        });
      }

      if (!cancelled) {
        setCards(results);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolved, resolvedKey]);

  // Pan handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-card]")) return;
      setPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!panning) return;
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    },
    [panning, panStart]
  );

  const onMouseUp = useCallback(() => setPanning(false), []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.2, Math.min(3, z * (e.deltaY > 0 ? 0.92 : 1.08))));
  }, []);

  const updatePos = useCallback((cs: string, dx: number, dy: number) => {
    setCards((prev) =>
      prev.map((c) =>
        c.codeSpace === cs ? { ...c, x: c.x + dx, y: c.y + dy } : c
      )
    );
  }, []);

  const handleSelect = useCallback(
    (cs: string) => {
      setSelected(cs);
      onCardSelect?.(cs);
    },
    [onCardSelect]
  );

  // Connections (SVG bezier curves)
  const connections = useMemo(() => {
    const out: Array<{ from: CardData; to: CardData }> = [];
    for (const card of cards) {
      for (const imp of card.imports) {
        const target = cards.find((c) => c.codeSpace === imp);
        if (target) out.push({ from: card, to: target });
      }
    }
    return out;
  }, [cards]);

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      ref={containerRef}
      role="region"
      aria-label="Vibe Canvas Code Space Visualization"
      style={{
        width: width || "100%",
        height: height || "100%",
        background: BG,
        overflow: "hidden",
        position: "relative",
        borderRadius: 12,
        cursor: panning ? "grabbing" : "grab",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      {/* Grid */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <defs>
          <pattern
            id="vgrid"
            width={40 * zoom}
            height={40 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (40 * zoom)} ${
              pan.y % (40 * zoom)
            })`}
          >
            <path
              d={`M ${40 * zoom} 0 L 0 0 0 ${40 * zoom}`}
              fill="none"
              stroke={BORDER}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#vgrid)" />
      </svg>

      {/* Canvas layer */}
      <div
        style={{
          position: "absolute",
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Connection lines */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 3000,
            height: 2000,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {connections.map((conn, i) => {
            const fx = conn.from.x + CARD_W;
            const fy = conn.from.y + CARD_H / 2;
            const tx = conn.to.x;
            const ty = conn.to.y + CARD_H / 2;
            const mx = (fx + tx) / 2;
            return (
              <g key={i}>
                <path
                  d={`M ${fx} ${fy} C ${mx} ${fy}, ${mx} ${ty}, ${tx} ${ty}`}
                  fill="none"
                  stroke={ACCENT}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  opacity={0.45}
                />
                <circle cx={tx} cy={ty} r={3.5} fill={ACCENT} opacity={0.6} />
              </g>
            );
          })}
        </svg>

        {/* Cards */}
        {cards.map((card) => (
          <motion.div
            key={card.codeSpace}
            data-card="true"
            drag
            dragMomentum={false}
            onDragEnd={(_, info) => {
              updatePos(card.codeSpace, info.offset.x / zoom, info.offset.y / zoom);
            }}
            onClick={() => handleSelect(card.codeSpace)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleSelect(card.codeSpace);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Select ${card.codeSpace}`}
            style={{
              position: "absolute",
              left: card.x,
              top: card.y,
              width: CARD_W,
              height: CARD_H,
              background: selected === card.codeSpace ? "#1e293b" : "#111827",
              border: `1px solid ${
                selected === card.codeSpace ? ACCENT : BORDER
              }`,
              borderRadius: 8,
              cursor: "pointer",
              overflow: "hidden",
              boxShadow:
                selected === card.codeSpace
                  ? `0 0 16px ${ACCENT}22`
                  : "0 2px 8px #00000044",
            }}
            whileHover={{ scale: 1.015 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                borderBottom: `1px solid ${BORDER}`,
                background: "#0f172a",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: TEXT,
                  fontFamily: "monospace",
                }}
              >
                {card.codeSpace}
              </span>
              <VibePulse codeSpace={card.codeSpace} size="sm" showVitals={false} />
            </div>

            {/* Preview iframe */}
            <div
              style={{
                flex: 1,
                position: "relative",
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <iframe
                title={`Preview of ${card.codeSpace}`}
                src={`/live/${card.codeSpace}/embed`}
                style={{
                  width: `${Math.round(100 / THUMB_SCALE)}%`,
                  height: `${Math.round(100 / THUMB_SCALE)}%`,
                  transform: `scale(${THUMB_SCALE})`,
                  transformOrigin: "top left",
                  border: "none",
                  pointerEvents: "none",
                }}
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
              />
            </div>

            {/* Import port indicator */}
            {card.imports.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  right: -5,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: ACCENT,
                  border: `2px solid #0f172a`,
                }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 6,
          background: `${BG}ee`,
          borderRadius: 6,
          padding: "4px 10px",
          border: `1px solid ${BORDER}`,
          alignItems: "center",
        }}
      >
        <button
          onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
          aria-label="Zoom in"
          style={{
            background: "none",
            border: "none",
            color: TEXT,
            cursor: "pointer",
            fontSize: 15,
            padding: "1px 6px",
          }}
        >
          +
        </button>
        <span style={{ color: MUTED, fontSize: 10, minWidth: 32, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z / 1.2))}
          aria-label="Zoom out"
          style={{
            background: "none",
            border: "none",
            color: TEXT,
            cursor: "pointer",
            fontSize: 15,
            padding: "1px 6px",
          }}
        >
          -
        </button>
        <div style={{ width: 1, height: 16, background: "#334155" }} />
        <button
          onClick={() => {
            setPan({ x: 40, y: 40 });
            setZoom(1);
          }}
          aria-label="Reset view"
          style={{
            background: "none",
            border: "none",
            color: MUTED,
            cursor: "pointer",
            fontSize: 10,
            padding: "1px 6px",
          }}
        >
          Reset
        </button>
      </div>

      {/* Loading */}
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${BG}ee`,
            color: MUTED,
            fontFamily: "monospace",
            fontSize: 13,
          }}
        >
          Loading codespaces...
        </div>
      )}
    </div>
  );
}
