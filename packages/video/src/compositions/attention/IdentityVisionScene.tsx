import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../../lib/constants';
import { fadeIn, slideIn, springScale, pulse } from '../../lib/animations';
import { KineticText } from '../../components/ui/KineticText';
import { SpikeLandLogo } from '../../components/branding/SpikeLandLogo';
import { AuroraBorealis } from '../../components/branding/GradientMesh';
import { SceneBackground, QuoteBlock } from './shared';

/**
 * CHAPTER 6: IdentityVisionScene (5400 frames / 180s)
 */
export function IdentityVisionScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* 0-180f: Title */}
      <Sequence durationInFrames={180}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <KineticText text="A New Hope" fontSize={110} color={COLORS.amber} type="reveal" />
          <div style={{ marginTop: 20 }}>
            <KineticText text="Passionate about programming, powered by AI." fontSize={40} color={COLORS.textSecondary} type="slide" direction="bottom" />
          </div>
        </div>
      </Sequence>

      {/* 180-900f: Identity Venn Diagram */}
      <Sequence from={180} durationInFrames={720}>
        <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ 
             width: 400, height: 400, borderRadius: '50%', backgroundColor: `${COLORS.cyan}22`, border: `4px solid ${COLORS.cyan}`, 
             transform: `translateX(${interpolate(frame - 180, [0, 300], [100, -50], { extrapolateRight: 'clamp' })}px)`,
             display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: COLORS.cyan 
           }}>
             Developer Identity
           </div>
           <div style={{ 
             width: 400, height: 400, borderRadius: '50%', backgroundColor: `${COLORS.fuchsia}22`, border: `4px solid ${COLORS.fuchsia}`, 
             transform: `translateX(${interpolate(frame - 180, [0, 300], [-100, 50], { extrapolateRight: 'clamp' })}px)`,
             display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: COLORS.fuchsia 
           }}>
             AI Revolution
           </div>
           <Sequence from={300}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                 <KineticText text="Context Engineering" fontSize={48} color={COLORS.textPrimary} type="scale" />
              </div>
           </Sequence>
        </AbsoluteFill>
      </Sequence>

      {/* 900-2100f: Personal story */}
      <Sequence from={900} durationInFrames={1200}>
        <AbsoluteFill style={{ padding: 100 }}>
           <div style={{ opacity: 0.3 }}>
             <AuroraBorealis intensity={0.5} />
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              {[
                "I want to be seen as a guy who really loves tech.",
                "Not just someone who uses AI as a crutch...",
                "...but someone who understands how to make AI truly useful.",
                "The passion didn't change. The tools evolved."
              ].map((text, i) => (
                <Sequence key={i} from={i * 240} durationInFrames={240}>
                   <QuoteBlock text={text} delay={0} />
                </Sequence>
              ))}
           </div>
        </AbsoluteFill>
      </Sequence>

      {/* 2100-3600f: Spike.land vision */}
      <Sequence from={2100} durationInFrames={1500}>
        <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
           <SpikeLandLogo size={80} animate={true} />
           <div style={{ marginTop: 20, fontSize: 32, color: COLORS.textSecondary }}>Building the Future</div>
           <div style={{ display: 'flex', gap: 40, marginTop: 60 }}>
              {[
                { title: "Agentic Development", icon: "🤖" },
                { title: "Context-First Architecture", icon: "🏛️" },
                { title: "Real-Time Collaboration", icon: "🤝" },
              ].map((card, i) => (
                <div key={card.title} style={{ 
                  padding: 40, backgroundColor: COLORS.darkCard, border: `1px solid ${COLORS.darkBorder}`, borderRadius: 20, textAlign: 'center',
                  transform: `translateY(${slideIn(frame - 2100, fps, 'bottom', 100, 0.5, i * 90)}px)`,
                  opacity: fadeIn(frame - 2100, fps, 0.3, i * 90)
                }}>
                  <div style={{ fontSize: 60, marginBottom: 20 }}>{card.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.textPrimary }}>{card.title}</div>
                </div>
              ))}
           </div>
        </AbsoluteFill>
      </Sequence>

      {/* 3600-4500f: Call to reflection */}
      <Sequence from={3600} durationInFrames={900}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
           <div style={{ fontSize: 48, fontWeight: 700, color: COLORS.textPrimary }}>What kind of developer do you want to be?</div>
           <div style={{ display: 'flex', gap: 100 }}>
              <div style={{ opacity: interpolate(frame - 3600, [60, 120], [1, 0.3], { extrapolateLeft: 'clamp' }) }}>
                 <div style={{ fontSize: 40, color: COLORS.textMuted }}>Fight the change</div>
                 <div style={{ fontSize: 60, textAlign: 'center' }}>⬅️</div>
              </div>
              <div style={{ opacity: interpolate(frame - 3600, [60, 120], [0.3, 1], { extrapolateLeft: 'clamp' }) }}>
                 <div style={{ fontSize: 40, color: COLORS.cyan, textShadow: `0 0 20px ${COLORS.cyan}` }}>Lead the change</div>
                 <div style={{ fontSize: 60, textAlign: 'center' }}>➡️</div>
              </div>
           </div>
        </AbsoluteFill>
      </Sequence>

      {/* 4500-5400f: Build with us */}
      <Sequence from={4500} durationInFrames={900}>
        <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
           <SpikeLandLogo size={120} animate={true} />
           <div style={{ display: 'flex', gap: 40, marginTop: 60 }}>
              {['Open Source', 'Context-First', 'Human-Centric'].map((text, i) => (
                <div key={text} style={{ 
                  fontSize: 32, fontWeight: 700, 
                  color: i === 0 ? COLORS.cyan : i === 1 ? COLORS.fuchsia : COLORS.amber,
                  transform: `scale(${springScale(frame - 4500, fps, undefined, i * 10)})`
                }}>
                  {text}
                </div>
              ))}
           </div>
           <div style={{ marginTop: 60, fontSize: 48, fontWeight: 900, color: COLORS.cyan, textShadow: `0 0 20px ${COLORS.cyan}` }}>join the movement. spike.land</div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
