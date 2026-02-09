import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../../lib/constants';
import { fadeIn, springScale, pulse } from '../../lib/animations';
import { KineticText } from '../../components/ui/KineticText';
import { SpikeLandLogo } from '../../components/branding/SpikeLandLogo';
import { AuroraBorealis } from '../../components/branding/GradientMesh';

/**
 * CHAPTER 7: OutroScene (1178 frames / ~39s)
 */
export function OutroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* 0-300f: AuroraBorealis + Logo Entry */}
      <Sequence durationInFrames={300}>
        <div style={{ opacity: fadeIn(frame, fps, 1) }}>
          <AuroraBorealis intensity={0.6} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
           <SpikeLandLogo size={160} animate={true} />
           <div style={{ marginTop: 40 }}>
              <KineticText text="Your agentic development partner." fontSize={40} color={COLORS.textSecondary} type="reveal" />
           </div>
        </div>
      </Sequence>

      {/* 300-720f: Key takeaways */}
      <Sequence from={300} durationInFrames={420}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
           {[
             { title: "Context > Speed", subtitle: "Quality context beats raw velocity", color: COLORS.cyan },
             { title: "Engineer the Input", subtitle: "Structure what the AI receives", color: COLORS.purple },
             { title: "Verify Everything", subtitle: "Trust but verify AI output", color: COLORS.amber },
             { title: "Stay Passionate", subtitle: "The tools change, the love doesn't", color: COLORS.fuchsia },
           ].map((card, i) => (
             <div key={i} style={{
               transform: `scale(${springScale(frame - 300, fps, undefined, i * 15)})`,
               opacity: fadeIn(frame - 300, fps, 0.3, i * 15),
               backgroundColor: `${card.color}15`,
               border: `2px solid ${card.color}`,
               borderRadius: 16,
               padding: '20px 30px',
               width: 450,
               boxShadow: `0 10px 30px rgba(0,0,0,0.3), 0 0 20px ${card.color}30`,
             }}>
               <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.title}</div>
               <div style={{ fontSize: 18, color: COLORS.textSecondary, marginTop: 4 }}>{card.subtitle}</div>
             </div>
           ))}
        </AbsoluteFill>
      </Sequence>

      {/* 720-1000f: CTA */}
      <Sequence from={720} durationInFrames={280}>
        <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
           <KineticText text="Subscribe for more" fontSize={60} color={COLORS.cyan} type="reveal" />
           <div style={{ display: 'flex', gap: 60, fontSize: 80 }}>
              <div style={{ transform: `scale(${springScale(frame - 720, fps, undefined, 30)})` }}>📺</div>
              <div style={{ transform: `scale(${springScale(frame - 720, fps, undefined, 45)})` }}>🔔</div>
              <div style={{ transform: `scale(${springScale(frame - 720, fps, undefined, 60)})` }}>💬</div>
           </div>
           <div style={{ 
             fontSize: 70, fontWeight: 900, color: COLORS.cyan, 
             textShadow: `0 0 ${20 + pulse(frame, fps, 1) * 20}px ${COLORS.cyan}` 
           }}>
             spike.land
           </div>
        </AbsoluteFill>
      </Sequence>

      {/* 1000-1178f: Final card */}
      <Sequence from={1000}>
        <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
           <SpikeLandLogo size={100} animate={true} />
           <div style={{ marginTop: 40, fontSize: 48, fontWeight: 900, color: COLORS.amber }}>spike.land</div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
