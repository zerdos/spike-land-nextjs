import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../../lib/constants';
import { fadeIn, pulse } from '../../lib/animations';
import { KineticText } from '../../components/ui/KineticText';
import { GlitchText } from '../../components/ui/GlitchText';
import { SpikeLandLogo } from '../../components/branding/SpikeLandLogo';
import { AuroraBorealis } from '../../components/branding/GradientMesh';
import { SceneBackground, SplitLayout } from './shared';

/**
 * CHAPTER 1: IntroScene (900 frames / 30s)
 */
export function IntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cyan dot pulse animation
  const dotOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: 'clamp' });
  const dotPulse = pulse(frame, fps, 0.5);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* 0-90f: Dark void + AuroraBorealis fade in */}
      <Sequence durationInFrames={900}>
        <div style={{ opacity: fadeIn(frame, fps, 2, 0) }}>
          <AuroraBorealis 
            intensity={0.4} 
          />
        </div>
      </Sequence>

      {/* 30f: Pulse dot */}
      <Sequence from={30}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 20,
          height: 20,
          backgroundColor: COLORS.cyan,
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: dotOpacity * (0.6 + dotPulse * 0.4),
          boxShadow: `0 0 ${20 + dotPulse * 20}px ${COLORS.cyan}`,
        }} />
      </Sequence>

      {/* 90-300f: Title Reveal */}
      <Sequence from={90} durationInFrames={810}>
        <AbsoluteFill style={{ zIndex: 10 }}>
          <SceneBackground 
            src="images/ch1_chaos_vs_order.png" 
            opacity={interpolate(frame, [90, 150], [0, 0.15], { extrapolateRight: 'clamp' })}
            blur={8}
          />
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%' 
          }}>
            <KineticText 
              text="Context Engineering" 
              fontSize={110} 
              color={COLORS.cyan} 
              type="reveal" 
              delay={0}
            />
            <Sequence from={60}>
              <div style={{ marginTop: 20 }}>
                <KineticText 
                  text="and the" 
                  fontSize={40} 
                  color={COLORS.textSecondary} 
                  type="slide" 
                  direction="bottom" 
                  delay={0}
                />
              </div>
            </Sequence>
            <Sequence from={90}>
              <div style={{ marginTop: 10 }}>
                <KineticText 
                  text="Physics of Attention" 
                  fontSize={90} 
                  color={COLORS.fuchsia} 
                  type="scale" 
                  delay={0}
                />
              </div>
            </Sequence>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 300-600f: Context Metaphor */}
      <Sequence from={300} durationInFrames={300}>
        <AbsoluteFill style={{ zIndex: 20, backgroundColor: COLORS.darkBg }}>
          <SplitLayout
            left={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ fontSize: 40, color: COLORS.error, fontWeight: 700, marginBottom: 20 }}>Raw Input</div>
                <GlitchText text="TODO: fix" fontSize={32} color={COLORS.error} />
                <Sequence from={30}><GlitchText text="legacy API" fontSize={32} color={COLORS.error} /></Sequence>
                <Sequence from={60}><GlitchText text="undocumented" fontSize={32} color={COLORS.error} /></Sequence>
                <Sequence from={90}><GlitchText text="assumptions" fontSize={32} color={COLORS.error} /></Sequence>
              </div>
            }
            right={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ fontSize: 40, color: COLORS.cyan, fontWeight: 700, marginBottom: 20 }}>Structured Context</div>
                {['System Prompt', 'Codebase Map', 'User Intent', 'Constraints'].map((text, i) => (
                  <Sequence key={text} from={i * 15}>
                    <div style={{
                      padding: '12px 24px',
                      backgroundColor: `${COLORS.darkCard}aa`,
                      border: `1px solid ${COLORS.cyan}50`,
                      borderRadius: 12,
                      fontSize: 28,
                      color: COLORS.textPrimary,
                    }}>
                      {text}
                    </div>
                  </Sequence>
                ))}
              </div>
            }
          />
          {/* Scan line effect */}
          <Sequence from={180}>
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 4,
              backgroundColor: COLORS.cyan,
              boxShadow: `0 0 20px ${COLORS.cyan}`,
              left: interpolate(frame - 480, [0, 60], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) + '%',
              zIndex: 100,
            }} />
          </Sequence>
        </AbsoluteFill>
      </Sequence>

      {/* 600-900f: Author Card */}
      <Sequence from={600} durationInFrames={300}>
        <AbsoluteFill style={{ zIndex: 30, backgroundColor: COLORS.darkBg }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Sequence from={60}>
              <div style={{ marginBottom: 60 }}>
                <SpikeLandLogo size={180} />
              </div>
            </Sequence>
            <Sequence from={120}>
              <KineticText text="by Zoltan Erdos" fontSize={48} color={COLORS.cyan} type="reveal" />
            </Sequence>
            <Sequence from={180}>
              <div style={{
                height: 2,
                backgroundColor: COLORS.cyan,
                width: interpolate(frame - 780, [0, 60], [0, 600], { extrapolateRight: 'clamp' }),
                margin: '30px 0',
              }} />
              <KineticText text="a personal story about building with AI" fontSize={32} color={COLORS.textSecondary} type="slide" direction="bottom" />
            </Sequence>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
