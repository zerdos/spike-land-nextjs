import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import VibePulse from "/live/vibe-pulse";

interface VibeTimelineProps {
  codeSpace?: string;
  height?: number | string;
  autoPlay?: boolean;
}

interface VersionInfo {
  number: number;
  hash: string;
  createdAt: number;
}

interface VersionDetail {
  code: string;
  transpiled: string;
  html: string;
  css: string;
  hash: string;
  createdAt: number;
}

interface DiffLine {
  text: string;
  type: "same" | "add" | "del";
}

function getCodeSpaceFromUrl(): string {
  if (typeof window === "undefined") return "vibe-pulse";
  const match = window.location.pathname.match(/^\/live\/([^/]+)/);
  return match ? match[1] : "vibe-pulse";
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: DiffLine[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const o = i < oldLines.length ? oldLines[i] : undefined;
    const n = i < newLines.length ? newLines[i] : undefined;

    if (o === n) {
      result.push({ text: n || "", type: "same" });
    } else {
      if (o !== undefined) result.push({ text: o, type: "del" });
      if (n !== undefined) result.push({ text: n, type: "add" });
    }
  }
  return result;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

const BG = "#0f172a";
const BG_DARK = "#0a0f1a";
const BORDER = "#1e293b";
const TEXT = "#e2e8f0";
const MUTED = "#64748b";
const ACCENT = "#3b82f6";

export default function VibeTimeline({
  codeSpace,
  height = "100%",
  autoPlay = false,
}: VibeTimelineProps) {
  const resolvedCS = codeSpace || getCodeSpaceFromUrl();

  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [selIdx, setSelIdx] = useState(-1);
  const [curCode, setCurCode] = useState("");
  const [prevCode, setPrevCode] = useState("");
  const [playing, setPlaying] = useState(autoPlay);
  const [loading, setLoading] = useState(true);
  const playRef = useRef<number | null>(null);

  // Load versions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/live/${resolvedCS}/versions`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const v: VersionInfo[] = (data.versions || []).sort(
          (a: VersionInfo, b: VersionInfo) => a.createdAt - b.createdAt
        );
        setVersions(v);
        if (v.length > 0) setSelIdx(v.length - 1);
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedCS]);

  // Fetch code for selected version + previous
  useEffect(() => {
    if (selIdx < 0 || versions.length === 0) return;
    let cancelled = false;
    const ver = versions[selIdx];
    (async () => {
      try {
        const res = await fetch(`/live/${resolvedCS}/version/${ver.number}`);
        if (res.ok && !cancelled) {
          const d: VersionDetail = await res.json();
          setCurCode(d.code || "");
        }
      } catch {
        /* ignore */
      }

      if (selIdx > 0) {
        try {
          const pv = versions[selIdx - 1];
          const res = await fetch(`/live/${resolvedCS}/version/${pv.number}`);
          if (res.ok && !cancelled) {
            const d: VersionDetail = await res.json();
            setPrevCode(d.code || "");
          }
        } catch {
          /* ignore */
        }
      } else {
        setPrevCode("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selIdx, versions, resolvedCS]);

  // Playback
  useEffect(() => {
    if (playing && versions.length > 1) {
      playRef.current = window.setInterval(() => {
        setSelIdx((prev) => {
          if (prev >= versions.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [playing, versions.length]);

  const diff = useMemo(() => computeDiff(prevCode, curCode), [prevCode, curCode]);
  const selVer = versions[selIdx];
  const timeSpan =
    versions.length > 1
      ? versions[versions.length - 1].createdAt - versions[0].createdAt
      : 1;

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const idx = Math.round(pct * (versions.length - 1));
      setSelIdx(Math.max(0, Math.min(versions.length - 1, idx)));
    },
    [versions.length]
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height,
          color: MUTED,
          fontFamily: "monospace",
        }}
      >
        Loading timeline...
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height,
          color: MUTED,
          fontFamily: "monospace",
        }}
      >
        No versions for {resolvedCS}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height,
        background: BG,
        color: TEXT,
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <VibePulse codeSpace={resolvedCS} size="sm" showVitals={false} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{resolvedCS}</div>
            <div style={{ fontSize: 10, color: MUTED }}>
              {versions.length} versions
              {selVer ? ` \u2022 ${formatDate(selVer.createdAt)}` : ""}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 6 }}>
          {[
            {
              label: "\u25C0",
              onClick: () => setSelIdx((i) => Math.max(0, i - 1)),
              disabled: selIdx <= 0,
            },
            {
              label: playing ? "\u23F8" : "\u25B6",
              onClick: () => setPlaying(!playing),
              disabled: false,
              accent: true,
            },
            {
              label: "\u25B6",
              onClick: () => setSelIdx((i) => Math.min(versions.length - 1, i + 1)),
              disabled: selIdx >= versions.length - 1,
            },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              disabled={btn.disabled}
              style={{
                background: btn.accent ? (playing ? "#ef4444" : ACCENT) : "none",
                border: btn.accent ? "none" : `1px solid #334155`,
                borderRadius: 5,
                color: btn.disabled ? "#334155" : "#fff",
                padding: "3px 10px",
                cursor: btn.disabled ? "default" : "pointer",
                fontSize: 11,
                fontWeight: btn.accent ? 600 : 400,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Split: preview + diff */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Live preview */}
        <div
          style={{
            flex: 1,
            position: "relative",
            borderRight: `1px solid ${BORDER}`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 10,
              fontSize: 9,
              color: MUTED,
              zIndex: 1,
              background: `${BG}cc`,
              padding: "1px 5px",
              borderRadius: 3,
            }}
          >
            Preview v{selVer?.number}
          </div>
          {selVer && (
            <iframe
              key={`${resolvedCS}-${selVer.number}`}
              src={`/live/${resolvedCS}/version/${selVer.number}/embed`}
              style={{
                width: "200%",
                height: "200%",
                transform: "scale(0.5)",
                transformOrigin: "top left",
                border: "none",
                background: "#fff",
              }}
              sandbox="allow-scripts allow-same-origin"
            />
          )}
        </div>

        {/* Diff view */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            fontSize: 11,
            lineHeight: "17px",
            background: BG_DARK,
          }}
        >
          <div
            style={{
              position: "sticky",
              top: 0,
              padding: "5px 10px",
              fontSize: 9,
              color: MUTED,
              background: BG_DARK,
              borderBottom: `1px solid ${BORDER}`,
              zIndex: 1,
            }}
          >
            v{selIdx > 0 ? versions[selIdx - 1].number : "\u2014"} \u2192 v
            {selVer?.number}
          </div>
          {diff.map((line, i) => (
            <div
              key={i}
              style={{
                padding: "0 10px",
                whiteSpace: "pre",
                background:
                  line.type === "add"
                    ? "#16a34a12"
                    : line.type === "del"
                    ? "#ef444412"
                    : "transparent",
                color:
                  line.type === "add"
                    ? "#4ade80"
                    : line.type === "del"
                    ? "#f87171"
                    : "#94a3b8",
                borderLeft: `2px solid ${
                  line.type === "add"
                    ? "#4ade80"
                    : line.type === "del"
                    ? "#f87171"
                    : "transparent"
                }`,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  opacity: 0.5,
                  userSelect: "none",
                }}
              >
                {line.type === "add" ? "+" : line.type === "del" ? "-" : " "}
              </span>
              {line.text}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline scrubber */}
      <div
        style={{
          height: 44,
          background: BG_DARK,
          borderTop: `1px solid ${BORDER}`,
          position: "relative",
          cursor: "pointer",
          flexShrink: 0,
        }}
        onClick={handleTimelineClick}
      >
        {versions.map((v, i) => {
          const pct =
            timeSpan > 0
              ? ((v.createdAt - versions[0].createdAt) / timeSpan) * 100
              : (i / Math.max(1, versions.length - 1)) * 100;
          const isSel = i === selIdx;
          return (
            <motion.div
              key={v.number}
              style={{
                position: "absolute",
                left: `${Math.max(1, Math.min(99, pct))}%`,
                bottom: 6,
                width: isSel ? 4 : 2,
                borderRadius: 1,
                transform: "translateX(-50%)",
                background: isSel ? ACCENT : "#334155",
              }}
              animate={{ height: isSel ? 28 : 14 }}
              transition={{ duration: 0.15 }}
            />
          );
        })}
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 5,
            fontSize: 10,
            color: MUTED,
          }}
        >
          {selIdx + 1} / {versions.length}
        </div>
      </div>
    </div>
  );
}
