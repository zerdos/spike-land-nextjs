import { Fragment, type FC } from "react";
import { COLORS, VERITASIUM_COLORS } from "../../lib/constants";

export type DarwinianTreeCoreProps = {
  generations?: number; // 1-3
  progress: number;
  width?: number;
  height?: number;
  className?: string;
};

type Branch = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  generation: number;
  survives: boolean;
  index: number;
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function buildTree(generations: number): Branch[] {
  const branches: Branch[] = [];
  let idx = 0;

  // Trunk
  branches.push({
    x1: 960, y1: 800,
    x2: 960, y2: 550,
    generation: 0,
    survives: true,
    index: idx++,
  });

  // Generation 1
  if (generations >= 1) {
    const gen1: Array<{ x2: number; y2: number; survives: boolean }> = [
      { x2: 760, y2: 380, survives: true },
      { x2: 1160, y2: 380, survives: false },
    ];
    for (const b of gen1) {
      branches.push({
        x1: 960, y1: 550,
        x2: b.x2, y2: b.y2,
        generation: 1,
        survives: b.survives,
        index: idx++,
      });
    }
  }

  // Generation 2
  if (generations >= 2) {
    const gen2: Array<{ parent: { x: number; y: number }; x2: number; y2: number; survives: boolean }> = [
      { parent: { x: 760, y: 380 }, x2: 620, y2: 240, survives: true },
      { parent: { x: 760, y: 380 }, x2: 880, y2: 250, survives: false },
      { parent: { x: 1160, y: 380 }, x2: 1060, y2: 240, survives: false },
      { parent: { x: 1160, y: 380 }, x2: 1280, y2: 260, survives: false },
    ];
    for (const b of gen2) {
      branches.push({
        x1: b.parent.x, y1: b.parent.y,
        x2: b.x2, y2: b.y2,
        generation: 2,
        survives: b.survives,
        index: idx++,
      });
    }
  }

  // Generation 3
  if (generations >= 3) {
    const gen3: Array<{ parent: { x: number; y: number }; x2: number; y2: number; survives: boolean }> = [
      { parent: { x: 620, y: 240 }, x2: 540, y2: 140, survives: true },
      { parent: { x: 620, y: 240 }, x2: 700, y2: 150, survives: false },
    ];
    for (const b of gen3) {
      branches.push({
        x1: b.parent.x, y1: b.parent.y,
        x2: b.x2, y2: b.y2,
        generation: 3,
        survives: b.survives,
        index: idx++,
      });
    }
  }

  return branches;
}

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const DarwinianTreeCore: FC<DarwinianTreeCoreProps> = ({
  generations = 3,
  progress,
  width = 1920,
  height = 1080,
  className,
}) => {
  const branches = buildTree(Math.min(3, Math.max(1, generations)));

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 1920 1080" 
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id="tree-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Branches */}
      {branches.map((branch) => {
        // Each branch starts growing based on its generation
        const branchStart = branch.generation * 0.2 + (branch.index % 5) * 0.05;
        const growProgress = clamp((progress - branchStart) * 5, 0, 1);

        const color = branch.survives
          ? VERITASIUM_COLORS.active
          : VERITASIUM_COLORS.failed;

        // Failed branches get pruned after appearing
        // Pruning happens in the second half of the overall progress
        const pruneStart = branchStart + 0.3;
        const pruneOpacity = branch.survives
          ? 1
          : clamp(1 - (progress - pruneStart) * 4, 0, 1);

        const currentX2 = branch.x1 + (branch.x2 - branch.x1) * growProgress;
        const currentY2 = branch.y1 + (branch.y2 - branch.y1) * growProgress;

        const strokeWidth = branch.generation === 0 ? 6 : 4 - branch.generation * 0.5;

        return (
          <Fragment key={`branch-${branch.index}`}>
            <line
              x1={branch.x1}
              y1={branch.y1}
              x2={currentX2}
              y2={currentY2}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={pruneOpacity * growProgress}
              filter={branch.survives ? "url(#tree-glow)" : undefined}
            />

            {/* Pruning cut mark on failed branches */}
            {!branch.survives && pruneOpacity < 0.8 && growProgress > 0.5 && (
              <line
                x1={branch.x1 + (branch.x2 - branch.x1) * 0.3 - 10}
                y1={branch.y1 + (branch.y2 - branch.y1) * 0.3 - 10}
                x2={branch.x1 + (branch.x2 - branch.x1) * 0.3 + 10}
                y2={branch.y1 + (branch.y2 - branch.y1) * 0.3 + 10}
                stroke={VERITASIUM_COLORS.failed}
                strokeWidth={3}
                opacity={1 - pruneOpacity}
              />
            )}

            {/* Learning particles floating up from pruned branches */}
            {!branch.survives &&
              pruneOpacity < 0.6 &&
              Array.from({ length: 3 }, (_, pi) => {
                const particleStart = pruneStart + 0.1 + pi * 0.05;
                const particleProgress = clamp((progress - particleStart) * 4, 0, 1);
                
                if (particleProgress <= 0) return null;

                const px = branch.x2 + seededRandom(branch.index * 10 + pi) * 40 - 20;
                const py = branch.y2 - particleProgress * 80;
                const particleOpacity = particleProgress < 0.3 
                   ? (particleProgress / 0.3) * 0.8 
                   : (1 - (particleProgress - 0.3) / 0.7) * 0.8;

                return (
                  <circle
                    key={`particle-${branch.index}-${pi}`}
                    cx={px}
                    cy={py}
                    r={3}
                    fill={VERITASIUM_COLORS.learning}
                    opacity={clamp(particleOpacity, 0, 0.8)}
                  />
                );
              })}
          </Fragment>
        );
      })}

      {/* Ground line */}
      <line
        x1={700}
        y1={800}
        x2={1220}
        y2={800}
        stroke={COLORS.darkBorder}
        strokeWidth={2}
        opacity={0.5}
      />

      {/* Legend */}
      <g transform="translate(100, 900)">
        <circle cx={0} cy={0} r={6} fill={VERITASIUM_COLORS.active} />
        <text x={16} y={5} fill={COLORS.textSecondary} fontSize={14} fontFamily="Inter, sans-serif">
          Survives (good code)
        </text>
        <circle cx={200} cy={0} r={6} fill={VERITASIUM_COLORS.failed} />
        <text x={216} y={5} fill={COLORS.textSecondary} fontSize={14} fontFamily="Inter, sans-serif">
          Pruned (bad code)
        </text>
        <circle cx={400} cy={0} r={4} fill={VERITASIUM_COLORS.learning} />
        <text x={416} y={5} fill={COLORS.textSecondary} fontSize={14} fontFamily="Inter, sans-serif">
          Learning notes
        </text>
      </g>
    </svg>
  );
}
