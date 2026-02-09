import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../../lib/constants';
import { springScale } from '../../lib/animations';
import { KineticText } from '../../components/ui/KineticText';
import { GlitchText } from '../../components/ui/GlitchText';
import { TextOverlay } from '../../components/ui/TextOverlay';
import { BarChart } from '../../components/ui/BarChart';
import { GlitchTransition } from '../../components/effects/GlitchTransition';
import { SceneBackground, QuoteBlock, AlertCard } from './shared';

/**
 * CHAPTER 2: UncertaintyScene (2700 frames / 90s)
 * frame 0 is relative to scene start
 */
export function UncertaintyScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* 0-180f: Title card */}
      <Sequence durationInFrames={180}>
        <GlitchTransition startFrame={0} duration={30}>
          <AbsoluteFill>
            <SceneBackground 
              src="images/ch2_news_montage.png" 
              opacity={0.25} 
              kenBurns={{ from: 1.08, to: 1.0 }} 
            />
            <div style={{ position: 'absolute', top: 50, left: 100, fontSize: 200, fontWeight: 900, color: COLORS.textPrimary, opacity: 0.08 }}>02</div>
            <TextOverlay 
              text="The Great Refactor" 
              subtext="A profession under reconstruction" 
              size="large" 
              gradient 
            />
          </AbsoluteFill>
        </GlitchTransition>
      </Sequence>

      {/* 180-600f: News headlines montage */}
      <Sequence from={180} durationInFrames={420}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, paddingTop: 100 }}>
          {[
            { title: "AI Replaces 40% of Junior Developer Roles", type: 'error' as const },
            { title: "Stack Overflow Traffic Down 55%", type: 'warning' as const },
            { title: "Promotion Pipelines Frozen", color: COLORS.fuchsia },
            { title: "obsolete in two years", isGlitch: true },
          ].map((item, i) => {
            const delay = i * 60;
            if ('isGlitch' in item) {
               return (
                 <Sequence key={i} from={delay}>
                   <div style={{ padding: '20px 40px', backgroundColor: `${COLORS.error}22`, borderRadius: 12 }}>
                     <GlitchText text={item.title.toUpperCase()} fontSize={40} color={COLORS.error} isGlitching={true} />
                   </div>
                 </Sequence>
               );
            }
            return (
              <AlertCard 
                key={i} 
                title={item.title} 
                type={item.type || 'info'} 
                delay={delay} 
              />
            );
          })}
        </AbsoluteFill>
      </Sequence>

      {/* 600-1200f: Career ladder visualization */}
      <Sequence from={600} durationInFrames={600}>
        <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
          <div style={{ position: 'absolute', left: '50%', top: '20%', bottom: '20%', width: 4, backgroundColor: COLORS.darkBorder }} />
          {['Junior', 'Mid', 'Senior', 'Staff'].map((level, i) => {
            const y = 80 - i * 20;
            return (
              <div key={level} style={{ position: 'absolute', left: '50%', top: `${y}%`, transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: COLORS.cyan, marginRight: 20 }} />
                <span style={{ fontSize: 32, color: COLORS.textPrimary, fontWeight: 600 }}>{level}</span>
              </div>
            );
          })}
          {/* Climbing dot */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: interpolate(frame - 600, [0, 300], [80, 40], { extrapolateRight: 'clamp' }) + '%',
            width: 24,
            height: 24,
            backgroundColor: COLORS.cyan,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 20px ${COLORS.cyan}`,
          }} />
          <Sequence from={300}>
            <div style={{ position: 'absolute', left: '50.5%', top: '40%', transform: 'translate(-30%, -130%)', fontSize: 60 }}>✅</div>
          </Sequence>
          <Sequence from={360}>
             <div style={{ 
               position: 'absolute', 
               left: '50%', 
               top: '20%', 
               transform: `translate(-50%, -50%) scale(${springScale(frame - 960, fps)})`,
               fontSize: 100,
               color: COLORS.error,
               textShadow: `0 0 20px ${COLORS.error}`,
             }}>
               ✖
             </div>
          </Sequence>
          <div style={{ position: 'absolute', bottom: 100, width: '100%', textAlign: 'center' }}>
            <KineticText text="Career progression... stopped." fontSize={44} color={COLORS.fuchsia} type="slide" />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 1200-1800f: Emotional beat */}
      <Sequence from={1200} durationInFrames={600}>
        <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
          <div style={{ padding: 100 }}>
            <QuoteBlock 
              text="The job title that defined my identity for 15 years... suddenly has an expiration date." 
              delay={0}
              charsPerSecond={20}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 100, marginTop: 50 }}>
             {['Career', 'Passion', 'Purpose'].map((text, i) => (
               <div key={text} style={{ position: 'relative' }}>
                 <div style={{ 
                   fontSize: 40, 
                   color: text === 'Passion' ? COLORS.cyan : COLORS.textMuted,
                   fontWeight: 700,
                   textShadow: text === 'Passion' ? `0 0 20px ${COLORS.cyan}` : 'none'
                 }}>
                   {text}
                 </div>
                 {i !== 1 && (
                   <div style={{ position: 'absolute', top: '50%', left: '-10%', right: '-10%', height: 4, backgroundColor: COLORS.error, transform: 'rotate(-10deg)' }} />
                 )}
               </div>
             ))}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 1800-2400f: BarChart */}
      <Sequence from={1800} durationInFrames={600}>
        <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, padding: 100 }}>
          <div style={{ fontSize: 40, color: COLORS.textPrimary, fontWeight: 700, marginBottom: 50, textAlign: 'center' }}>% of Dev Teams Using AI Daily</div>
          <BarChart 
            maxValue={100}
            data={[
              { label: '2023', value: 15, color: COLORS.darkBorder },
              { label: '2024', value: 42, color: COLORS.warning },
              { label: '2025', value: 71, color: COLORS.cyan },
              { label: '2026', value: 93, color: COLORS.fuchsia },
            ]}
          />
        </AbsoluteFill>
      </Sequence>

      {/* 2400-2700f: Closing question */}
      <Sequence from={2400} durationInFrames={300}>
        <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <KineticText text="So what do you do?" fontSize={80} color={COLORS.cyan} type="reveal" />
          <Sequence from={60}>
            <div style={{ marginTop: 20 }}>
               <KineticText text="When the ground shifts beneath you?" fontSize={40} color={COLORS.textSecondary} type="slide" direction="bottom" />
            </div>
          </Sequence>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
