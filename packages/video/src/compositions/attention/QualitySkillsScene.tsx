import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../../lib/constants';
import { fadeIn, slideIn, springScale, pulse } from '../../lib/animations';
import { KineticText } from '../../components/ui/KineticText';
import { GlitchText } from '../../components/ui/GlitchText';
import { SceneBackground, SkillCard } from './shared';

/**
 * CHAPTER 5: QualitySkillsScene (5400 frames / 180s)
 */
export function QualitySkillsScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* 0-180f: Title */}
      <Sequence durationInFrames={180}>
        <SceneBackground src="images/scene_quality_triangle_v2_1770634140682.png" opacity={0.2} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <GlitchText text="Quality Triangle" fontSize={80} color={COLORS.cyan} />
          <Sequence from={60}>
            <GlitchText text="BROKEN" fontSize={120} color={COLORS.error} />
          </Sequence>
        </div>
      </Sequence>

      {/* 180-900f: Classic triangle */}
      <Sequence from={180} durationInFrames={720}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="600" height="600" viewBox="0 0 100 100">
             <polygon 
               points="50,10 90,80 10,80" 
               fill="none" 
               stroke={COLORS.textMuted} 
               strokeWidth="1"
               strokeDasharray="300"
               strokeDashoffset={interpolate(frame - 180, [0, 90], [300, 0], { extrapolateRight: 'clamp' })}
             />
             <text x="50" y="5" textAnchor="middle" fontSize="6" fill={COLORS.textPrimary} style={{ opacity: fadeIn(frame - 180, fps, 0.5, 60) }}>High Quality</text>
             <text x="95" y="85" textAnchor="middle" fontSize="6" fill={COLORS.textPrimary} style={{ opacity: fadeIn(frame - 180, fps, 0.5, 90) }}>Fast</text>
             <text x="5" y="85" textAnchor="middle" fontSize="6" fill={COLORS.textPrimary} style={{ opacity: fadeIn(frame - 180, fps, 0.5, 120) }}>Cheap</text>
          </svg>
          <div style={{ marginTop: 40 }}>
             <KineticText text="Pick Two." fontSize={60} color={COLORS.warning} type="reveal" />
          </div>
          <Sequence from={600}>
             <div style={{ position: 'absolute', fontSize: 200, color: COLORS.error, opacity: 0.8 }}>✖</div>
          </Sequence>
        </AbsoluteFill>
      </Sequence>

      {/* 900-1800f: New paradigm */}
      <Sequence from={900} durationInFrames={900}>
        <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ fontSize: 40, color: COLORS.textSecondary, marginBottom: 40 }}>What if you could have all three?</div>
           <svg width="600" height="600" viewBox="0 0 100 100">
             <polygon 
               points="50,10 90,80 10,80" 
               fill={`${COLORS.cyan}11`} 
               stroke={COLORS.cyan} 
               strokeWidth="2"
               style={{ 
                 filter: `drop-shadow(0 0 10px ${COLORS.cyan})`,
                 opacity: fadeIn(frame - 900, fps, 1, 60)
               }}
             />
             {/* Center text - using interpolate instead of Sequence (div invalid inside svg) */}
             <text x="50" y="55" textAnchor="middle" fontSize="6" fill={COLORS.cyan} fontWeight="900" style={{ opacity: fadeIn(frame - 900, fps, 0.5, 180) }}>CONTEXT</text>
             <text x="50" y="65" textAnchor="middle" fontSize="6" fill={COLORS.cyan} fontWeight="900" style={{ opacity: fadeIn(frame - 900, fps, 0.5, 180) }}>ENGINEERING</text>
          </svg>
          <div style={{ marginTop: 40 }}>
             <KineticText text="Choose All Three." fontSize={80} color={COLORS.success} type="scale" />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 1800-3000f: Skills framework */}
      <Sequence from={1800} durationInFrames={1200}>
        <AbsoluteFill style={{ padding: 80, display: 'flex', flexDirection: 'column' }}>
           <div style={{ fontSize: 48, fontWeight: 900, color: COLORS.textPrimary, marginBottom: 60, textAlign: 'center' }}>The New Developer Skills</div>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 }}>
              {[
                { icon: '🗺️', name: 'Codebase Cartography', value: 90, color: COLORS.cyan },
                { icon: '🏛️', name: 'Prompt Architecture', value: 85, color: COLORS.purple },
                { icon: '🗜️', name: 'Context Compression', value: 75, color: COLORS.fuchsia },
                { icon: '🧪', name: 'Verification Design', value: 80, color: COLORS.success },
                { icon: '📡', name: 'Dependency Awareness', value: 70, color: COLORS.warning },
                { icon: '🎼', name: 'Human-AI Orchestration', value: 95, color: COLORS.cyan },
              ].map((skill, i) => (
                <SkillCard 
                  key={skill.name} 
                  icon={skill.icon} 
                  name={skill.name} 
                  value={skill.value} 
                  color={skill.color} 
                  delay={i * 60} 
                />
              ))}
           </div>
        </AbsoluteFill>
      </Sequence>

      {/* 3000-4200f: Workflow diagram */}
      <Sequence from={3000} durationInFrames={1200}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {['Map Codebase', 'Build Context', 'Instruct AI', 'Verify Output', 'Deploy'].map((step, i) => (
                <React.Fragment key={step}>
                  <div style={{ 
                    padding: '24px 32px', 
                    backgroundColor: Math.floor((frame - 3000) / 120) >= i ? `${COLORS.cyan}22` : COLORS.darkCard, 
                    border: `2px solid ${Math.floor((frame - 3000) / 120) >= i ? COLORS.cyan : COLORS.darkBorder}`,
                    borderRadius: 16,
                    fontSize: 20,
                    color: Math.floor((frame - 3000) / 120) >= i ? COLORS.textPrimary : COLORS.textMuted,
                    transform: `scale(${Math.floor((frame - 3000) / 120) === i ? 1.1 : 1})`
                  }}>
                    {step}
                  </div>
                  {i < 4 && <div style={{ fontSize: 30, color: COLORS.textMuted }}>➔</div>}
                </React.Fragment>
              ))}
           </div>
           <div style={{ marginTop: 80 }}>
              <KineticText text="Linear time. Exponential output." fontSize={40} color={COLORS.cyan} type="reveal" />
           </div>
        </AbsoluteFill>
      </Sequence>

      {/* 4200-5400f: Closing statements */}
      <Sequence from={4200} durationInFrames={1200}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
           {[
             'It\'s not about replacing developers',
             'It\'s about augmenting them',
             'With the RIGHT context',
           ].map((text, i) => (
             <Sequence key={i} from={i * 240} durationInFrames={240}>
                <div style={{ 
                  fontSize: 70, 
                  fontWeight: 900, 
                  color: i === 1 ? COLORS.cyan : i === 2 ? COLORS.fuchsia : COLORS.textPrimary,
                  transform: i === 2 ? `scale(${springScale(frame - 4680, fps)})` : 'none'
                }}>
                  {text}
                </div>
             </Sequence>
           ))}
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
