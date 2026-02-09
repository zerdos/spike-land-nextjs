import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { COLORS, SPRING_CONFIGS } from '../../lib/constants';
import { ChapterTitle } from './shared';
import { AttentionPie } from '../../components/ui';
import { KineticText } from '../../components/ui/KineticText';
import { SpikeLandLogo } from '../../components/branding/SpikeLandLogo';

export const Scene10_MetaOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* Stage 1: 0-300 (22304-22604) "one last thing that broke my brain" */}
      {frame < 300 && (
        <ChapterTitle 
            number="10" 
            title="Meta Revelation" 
            subtitle="It goes all the way down." 
        />
      )}

      {/* Stage 2: 300-1000 (22604-23304) 16 parallel AI agents */}
      {frame >= 300 && frame < 1000 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60 }}>
            <KineticText text="16 Parallel Agents" fontSize={60} color={COLORS.cyan} type="reveal" />
            
            <div style={{ position: 'relative', width: '600px', height: '600px' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 40 }}>📄</div>
                
                {Array.from({ length: 16 }).map((_, i) => {
                    const angle = (i / 16) * 2 * Math.PI;
                    const radius = 250;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    const active = frame >= 400 + i * 15;
                    
                    return (
                        <React.Fragment key={i}>
                            <div style={{ 
                                position: 'absolute', 
                                left: `calc(50% + ${x}px)`, 
                                top: `calc(50% + ${y}px)`, 
                                transform: 'translate(-50%, -50%)',
                                fontSize: 32,
                                opacity: active ? 1 : 0.2,
                                transition: 'opacity 0.3s ease'
                            }}>
                                🤖
                            </div>
                            {active && (
                                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                                    <line 
                                        x1="300" 
                                        y1="300" 
                                        x2={300 + x} 
                                        y2={300 + y} 
                                        stroke={COLORS.cyan} 
                                        strokeWidth={1} 
                                        strokeOpacity={0.3} 
                                    />
                                </svg>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            
            <div style={{ fontSize: 24, fontStyle: 'italic', color: COLORS.textMuted }}>
                "This article was researched, outlined, and checked by 16 AI agents."
            </div>
        </div>
      )}

      {/* Stage 3: 1000-1500 (23304-23804) Context engineering all the way down */}
      {frame >= 1000 && frame < 1500 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 40 }}>
            <div style={{ fontSize: 40, color: COLORS.textSecondary }}>The article about context engineering...</div>
            <div style={{ transform: `scale(${interpolate(frame, [1100, 1400], [1, 5], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' })})`, opacity: interpolate(frame, [1300, 1500], [1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }) }}>
                <KineticText text="Was Context Engineered" fontSize={80} color={COLORS.cyan} type="reveal" />
            </div>
            {frame >= 1100 && (
                <div style={{ fontSize: 32, color: COLORS.fuchsia, fontWeight: 800 }}>RECURSIVE EXCELLENCE</div>
            )}
        </div>
      )}

      {/* Stage 4: 1500-2000 (23804-24204) Attention is finite / check hygiene */}
      {frame >= 1500 && frame < 2000 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60 }}>
            <AttentionPie 
                segments={[
                    { label: "Signal", value: 90, color: COLORS.cyan },
                    { label: "Noise", value: 10, color: COLORS.error }
                ]}
                size={400}
                delay={0}
            />
            <div style={{ textAlign: 'center' }}>
                <KineticText text="Stop filling your pie with junk." fontSize={50} color="white" type="reveal" />
                <div style={{ marginTop: 20 }}>
                    <KineticText text="Check your context hygiene." fontSize={32} color={COLORS.cyan} type="slide" direction="bottom" delay={40} />
                </div>
            </div>
        </div>
      )}

      {/* Stage 5: 2000-2274 (24204-24578) Outro */}
      {frame >= 2000 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 40 }}>
            <div style={{ transform: `scale(${spring({ frame: frame - 2000, fps, config: SPRING_CONFIGS.bouncy })})` }}>
                <SpikeLandLogo size={200} />
            </div>
            <div style={{ marginTop: 40, opacity: interpolate(frame, [2050, 2100], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }) }}>
                <KineticText text="Thanks for watching" fontSize={40} color={COLORS.textSecondary} type="reveal" />
            </div>
            <div style={{ opacity: interpolate(frame, [2150, 2200, 2274 - 20, 2274], [0, 1, 1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }) }}>
                <KineticText text="See you next time." fontSize={24} color={COLORS.textMuted} type="reveal" delay={20} />
            </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
