import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../../lib/constants';
import { fadeIn, slideIn, springScale, countUp, shake } from '../../lib/animations';
import { KineticText } from '../../components/ui/KineticText';
import { TextOverlay } from '../../components/ui/TextOverlay';
import { CodeBlock } from '../../components/ui/CodeBlock';
import { ChatBubble } from '../../components/ui/ChatBubble';
import { SceneBackground, SplitLayout } from './shared';

/**
 * CHAPTER 3: ProductivityScene (3600 frames / 120s)
 */
export function ProductivityScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Speedometer needle rotation
  const needleRotation = interpolate(frame - 180, [0, 300], [-90, 90], { extrapolateRight: 'clamp' });
  const individualOutput = countUp(frame - 180, fps, 500, 2, 0) + 50;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* 0-180f: Title card */}
      <Sequence durationInFrames={180}>
        <SceneBackground src="images/ch3_speedometer.png" opacity={0.2} />
        <TextOverlay 
          text="The Productivity Paradox" 
          subtext="The faster I code, the slower the team moves." 
          size="large" 
          gradient 
        />
      </Sequence>

      {/* 180-600f: Speed visualization */}
      <Sequence from={180} durationInFrames={420}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 400, height: 200, border: '4px solid #333', borderBottom: 'none', borderTopLeftRadius: 200, borderTopRightRadius: 200, overflow: 'hidden' }}>
             <div style={{ position: 'absolute', bottom: 0, left: '50%', width: 200, height: 4, backgroundColor: COLORS.cyan, transformOrigin: 'left center', transform: `rotate(${needleRotation}deg)`, transition: 'transform 0.1s' }} />
             <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', fontSize: 40, color: COLORS.textPrimary, fontWeight: 700 }}>
               {individualOutput}
             </div>
          </div>
          <div style={{ marginTop: 20, fontSize: 24, color: COLORS.textSecondary }}>Lines of Code / Day</div>
          <div style={{ marginTop: 10, fontSize: 32, fontWeight: 700, color: COLORS.cyan }}>Individual Output: 10x</div>
        </AbsoluteFill>
      </Sequence>

      {/* 600-1200f: PR bottleneck */}
      <Sequence from={600} durationInFrames={600}>
        <AbsoluteFill style={{ padding: 100, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 40 }}>The PR Queue Bottleneck</div>
          {[1, 2, 3, 4, 5].map((item, i) => (
             <div key={i} style={{ 
               padding: 24, 
               backgroundColor: `${COLORS.darkCard}aa`, 
               border: `1px solid ${COLORS.darkBorder}`, 
               borderRadius: 16,
               display: 'flex',
               justifyContent: 'space-between',
               transform: `translateX(${slideIn(frame - 600, fps, 'right', 400, 0.5, i * 60)}px)`,
               opacity: fadeIn(frame - 600, fps, 0.3, i * 60),
             }}>
               <span style={{ fontSize: 24, color: COLORS.textPrimary }}>Pull Request #{840 + i}</span>
               <span style={{ fontSize: 20, color: COLORS.warning }}>Waiting {3 + i} days</span>
             </div>
          ))}
          <Sequence from={300}>
            <div style={{ position: 'absolute', top: '50%', right: 100, padding: '30px 60px', backgroundColor: `${COLORS.error}22`, border: `2px solid ${COLORS.error}`, borderRadius: 20, transform: `scale(${springScale(frame - 900, fps)})` }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: COLORS.error }}>Sprint Velocity: -68%</div>
            </div>
          </Sequence>
        </AbsoluteFill>
      </Sequence>

      {/* 1200-1800f: Quote + timeline */}
      <Sequence from={1200} durationInFrames={600}>
        <SplitLayout
          left={<ChatBubble message="If I do a PR fast, it won't even be looked at until the end of the sprint." isAgent={false} />}
          right={
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
               {Array.from({ length: 10 }).map((_, i) => (
                 <div key={i} style={{ 
                   height: 100, 
                   backgroundColor: i === 0 ? COLORS.success : i === 8 ? COLORS.warning : i === 9 ? COLORS.error : COLORS.darkBorder,
                   borderRadius: 8,
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   fontSize: 14,
                   color: COLORS.textPrimary,
                 }}>
                   Day {i + 1}
                 </div>
               ))}
               <div style={{ gridColumn: 'span 5', textAlign: 'center', marginTop: 40 }}>
                 <KineticText text="Code ages. Context evaporates." fontSize={40} color={COLORS.cyan} type="slide" />
               </div>
            </div>
          }
        />
      </Sequence>

      {/* 1800-2400f: Paradox diagram */}
      <Sequence from={1800} durationInFrames={600}>
        <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 100 }}>
          <div style={{ width: 300, height: 300, borderRadius: '50%', backgroundColor: `${COLORS.cyan}22`, border: `4px solid ${COLORS.cyan}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${interpolate(frame - 1800, [0, 300], [1, 1.5], { extrapolateRight: 'clamp' })})` }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.cyan }}>Developer Speed</div>
            <div style={{ fontSize: 60 }}>⬆️</div>
          </div>
          <div style={{ fontSize: 60 }}>⚡</div>
          <div style={{ width: 300, height: 300, borderRadius: '50%', backgroundColor: `${COLORS.error}22`, border: `4px solid ${COLORS.error}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${interpolate(frame - 1800, [0, 300], [1, 0.6], { extrapolateRight: 'clamp' })})` }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.error }}>Team Throughput</div>
            <div style={{ fontSize: 60 }}>⬇️</div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* 2400-3000f: Human cost */}
      <Sequence from={2400} durationInFrames={600}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
           {['Merge conflicts multiply', 'Context is lost', 'Trust erodes', 'Reviewer becomes bottleneck'].map((text, i) => (
             <Sequence key={i} from={i * 120} durationInFrames={120}>
               <TextOverlay text={text} size="medium" gradient={i % 2 === 0} />
             </Sequence>
           ))}
        </AbsoluteFill>
      </Sequence>

      {/* 3000-3600f: Code comparison */}
      <Sequence from={3000} durationInFrames={600}>
        <AbsoluteFill style={{ padding: 100 }}>
          <div style={{ display: 'flex', gap: 40, height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontSize: 24, color: COLORS.textSecondary }}>Old Way</div>
              <CodeBlock code={`await waitForHuman();\n// 11 days later...\nmerge();`} />
              <div style={{ fontSize: 32, fontWeight: 900, color: COLORS.error }}>11 DAYS</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontSize: 24, color: COLORS.cyan }}>Context Engineering</div>
              <CodeBlock code={`await buildContext();\nawait aiReview();\nmerge();`} />
              <div style={{ fontSize: 32, fontWeight: 900, color: COLORS.cyan, textShadow: `0 0 20px ${COLORS.cyan}` }}>11 MINUTES</div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
