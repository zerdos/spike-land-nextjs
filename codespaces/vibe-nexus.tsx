import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import VibePulse from "/live/vibe-pulse";
import VibeTimeline from "/live/vibe-timeline";
import VibeCanvas from "/live/vibe-canvas";

interface VibeNexusProps {
  initialCodeSpaces?: string[];
  defaultSelected?: string;
}

const BG = "#0a0f1a";
const BG_PANEL = "#0f172a";
const BORDER = "#1e293b";
const TEXT = "#e2e8f0";
const MUTED = "#64748b";
const ACCENT = "#3b82f6";

const DEFAULT_SPACES = ["vibe-pulse", "vibe-timeline", "vibe-canvas"];

export default function VibeNexus({
  initialCodeSpaces,
  defaultSelected,
}: VibeNexusProps) {
  const spaces = initialCodeSpaces || DEFAULT_SPACES;
  const [selectedCS, setSelectedCS] = useState(defaultSelected || spaces[0]);
  const [mode, setMode] = useState<"now" | "then">("now");

  // Panel widths as percentages
  const [leftPct, setLeftPct] = useState(28);
  const [rightPct, setRightPct] = useState(18);
  const [resizing, setResizing] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize logic
  useEffect(() => {
    if (!resizing) return;

    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      if (resizing === "left") {
        setLeftPct(Math.max(15, Math.min(45, pct)));
      } else {
        setRightPct(Math.max(10, Math.min(35, 100 - pct)));
      }
    };
    const onUp = () => setResizing(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        background: BG,
        color: TEXT,
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          borderBottom: `1px solid ${BORDER}`,
          background: BG_PANEL,
          height: 40,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT, letterSpacing: "0.06em" }}>
            VIBE NEXUS
          </span>
          <div style={{ width: 1, height: 18, background: BORDER }} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>{selectedCS}</span>
        </div>

        <div style={{ display: "flex", gap: 3 }}>
          {(["now", "then"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                background: mode === m ? ACCENT : "transparent",
                border: `1px solid ${mode === m ? ACCENT : "#334155"}`,
                color: mode === m ? "#fff" : MUTED,
                borderRadius: 5,
                padding: "3px 12px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 500,
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left: Canvas */}
        <div
          style={{
            width: `${leftPct}%`,
            borderRight: `1px solid ${BORDER}`,
            overflow: "hidden",
          }}
        >
          <VibeCanvas
            codeSpaces={spaces}
            onCardSelect={setSelectedCS}
          />
        </div>

        {/* Left resize handle */}
        {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
          onMouseDown={() => setResizing("left")}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setLeftPct((p) => Math.max(15, p - 1));
            if (e.key === "ArrowRight") setLeftPct((p) => Math.min(45, p + 1));
          }}
          style={{
            width: 3,
            cursor: "col-resize",
            background: resizing === "left" ? ACCENT : "transparent",
            transition: "background 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!resizing) e.currentTarget.style.background = `${ACCENT}44`;
          }}
          onMouseLeave={(e) => {
            if (!resizing) e.currentTarget.style.background = "transparent";
          }}
        />
        {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}

        {/* Center: Preview or Timeline */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {mode === "now" ? (
            <div style={{ flex: 1, position: "relative", background: "#fff" }}>
              <iframe
                key={selectedCS}
                title={`Live preview of ${selectedCS}`}
                src={`/live/${selectedCS}/embed`}
                style={{ width: "100%", height: "100%", border: "none" }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          ) : (
            <VibeTimeline codeSpace={selectedCS} />
          )}
        </div>

        {/* Right resize handle */}
        {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
          onMouseDown={() => setResizing("right")}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setRightPct((p) => Math.min(35, p + 1));
            if (e.key === "ArrowRight") setRightPct((p) => Math.max(10, p - 1));
          }}
          style={{
            width: 3,
            cursor: "col-resize",
            background: resizing === "right" ? ACCENT : "transparent",
            transition: "background 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!resizing) e.currentTarget.style.background = `${ACCENT}44`;
          }}
          onMouseLeave={(e) => {
            if (!resizing) e.currentTarget.style.background = "transparent";
          }}
        />
        {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}

        {/* Right: Pulse monitors */}
        <div
          style={{
            width: `${rightPct}%`,
            borderLeft: `1px solid ${BORDER}`,
            padding: "10px 6px",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: MUTED,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 2,
            }}
          >
            Vitals
          </div>
          {spaces.map((cs) => (
            <motion.div
              key={cs}
              onClick={() => setSelectedCS(cs)}
              style={{
                cursor: "pointer",
                padding: 6,
                borderRadius: 6,
                background: selectedCS === cs ? "#1e293b" : "transparent",
                border: `1px solid ${selectedCS === cs ? ACCENT : "transparent"}`,
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
              whileHover={{ backgroundColor: "#1e293b66" }}
            >
              <VibePulse codeSpace={cs} size="sm" showVitals={true} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
