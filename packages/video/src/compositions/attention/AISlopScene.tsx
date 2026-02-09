import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../../lib/constants';
import { fadeIn, slideIn, springScale, countUp } from '../../lib/animations';
import { KineticText } from '../../components/ui/KineticText';
import { GlitchText } from '../../components/ui/GlitchText';
import { CodeBlock } from '../../components/ui/CodeBlock';
import { ChatBubble } from '../../components/ui/ChatBubble';
import { StageProgress } from '../../components/ui/ProgressBar';
import { BarChart } from '../../components/ui/BarChart';
import { GlitchTransition } from '../../components/effects/GlitchTransition';
import { SplitLayout, AlertCard } from './shared';

/**
 * CHAPTER 4: AISlopScene (5400 frames / 180s)
 */
export function AISlopScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* 0-180f: Title card */}
      <Sequence durationInFrames={180}>
        <GlitchTransition startFrame={0} duration={30} intensity={1.2}>
          <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 100, marginBottom: 20 }}>⚠️</div>
            <GlitchText text="The AI Slop Confession" fontSize={80} color={COLORS.amber} isGlitching={true} />
            <div style={{ marginTop: 30 }}>
              <KineticText text="When agents make assumptions you can't verify." fontSize={32} color={COLORS.textSecondary} type="slide" />
            </div>
          </AbsoluteFill>
        </GlitchTransition>
      </Sequence>

      {/* 180-600f: Legacy codebase setup */}
      <Sequence from={180} durationInFrames={420}>
        <AbsoluteFill style={{ padding: 100 }}>
          <div style={{ fontSize: 32, color: COLORS.textSecondary, marginBottom: 20 }}>// legacy/api/basket.ts (est. 2019)</div>
          <CodeBlock code={`// WARNING: Do not touch without consulting the elders\n// 47 implicit dependencies found\n// 3 undocumented side effects\n// Last modified: 2 years ago\n\nexport const updateBasket = async (id: string, items: any) => {\n  // ... mystery logic ...\n};`} />
          <Sequence from={120}>
             <div style={{ position: 'absolute', top: 150, right: 150, padding: '20px 40px', backgroundColor: COLORS.error, borderRadius: 12, transform: `scale(${springScale(frame - 300, fps)})` }}>
               <div style={{ fontSize: 32, fontWeight: 900, color: COLORS.textPrimary }}>Technical Debt: Critical</div>
             </div>
          </Sequence>
        </AbsoluteFill>
      </Sequence>

      {/* 600-1200f: AI agent enters */}
      <Sequence from={600} durationInFrames={600}>
        <SplitLayout
          left={<CodeBlock code={`// AI is refactoring...`} />}
          right={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
               <ChatBubble message="Refactor the basket API" isAgent={false} />
               <Sequence from={60}>
                  <ChatBubble message="This should be straightforward..." isAgent={true} />
               </Sequence>
               <Sequence from={120}>
                  <StageProgress stages={['Analyzing', 'Generating', 'Testing', 'Done']} currentStage={Math.min(3, Math.floor((frame - 720) / 100))} />
               </Sequence>
               <Sequence from={420}>
                  <div style={{ alignSelf: 'center', padding: '16px 32px', backgroundColor: COLORS.success, borderRadius: 30, color: COLORS.textPrimary, fontWeight: 900, transform: `scale(${springScale(frame - 1020, fps)})` }}>
                    SUCCESS
                  </div>
               </Sequence>
            </div>
          }
        />
      </Sequence>

      {/* 1200-2400f: Disaster unfolds */}
      <Sequence from={1200} durationInFrames={1200}>
        <AbsoluteFill style={{ backgroundColor: `${COLORS.error}11` }}>
           <div style={{ position: 'absolute', top: '10%', right: '10%' }}>
              <GlitchText text="FAILURE" fontSize={120} color={COLORS.error} />
           </div>
           <div style={{ padding: 100, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { title: "Basket service returning null", delay: 60 },
                { title: "Cart abandonment +340%", delay: 120 },
                { title: "Revenue impact: -$47K/hour", delay: 180, type: 'error' as const },
              ].map((alert, i) => (
                <div key={i} style={{ transform: `translateX(${slideIn(frame - 1200, fps, 'right', 400, 0.5, alert.delay)}px)` }}>
                   <AlertCard title={alert.title} type={alert.type || 'warning'} />
                </div>
              ))}
           </div>
           <Sequence from={400}>
             <div style={{ position: 'absolute', bottom: 100, width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 40, color: COLORS.textSecondary }}>Revenue Lost in 18 Hours:</div>
                <div style={{ fontSize: 120, fontWeight: 900, color: COLORS.error }}>
                  ${countUp(frame - 1600, fps, 847000, 5, 0).toLocaleString()}
                </div>
             </div>
           </Sequence>
        </AbsoluteFill>
      </Sequence>

      {/* 2400-3600f: Anatomy of failure */}
      <Sequence from={2400} durationInFrames={1200}>
        <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
           <div style={{ fontSize: 48, fontWeight: 700, color: COLORS.textPrimary, marginBottom: 60 }}>What Went Wrong?</div>
           <div style={{ display: 'flex', gap: 40 }}>
              {[
                { title: "No Context", color: COLORS.error },
                { title: "No Guardrails", color: COLORS.warning },
                { title: "No Verification", color: COLORS.fuchsia },
              ].map((card, i) => (
                <div key={i} style={{ 
                  padding: 40, 
                  backgroundColor: `${COLORS.darkCard}aa`, 
                  border: `2px solid ${card.color}`, 
                  borderRadius: 20,
                  transform: `translateY(${slideIn(frame - 2400, fps, 'bottom', 100, 0.5, i * 60)}px)`,
                  opacity: fadeIn(frame - 2400, fps, 0.3, i * 60),
                }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: card.color }}>{card.title}</div>
                </div>
              ))}
           </div>
           <Sequence from={300}>
              <div style={{ marginTop: 80, padding: 60, backgroundColor: `${COLORS.error}22`, borderRadius: 30, border: `3px dashed ${COLORS.error}`, transform: `scale(${springScale(frame - 2700, fps)})` }}>
                 <div style={{ fontSize: 40, fontWeight: 900, color: COLORS.error }}>THE ROOT CAUSE: Context Poverty</div>
              </div>
           </Sequence>
        </AbsoluteFill>
      </Sequence>

      {/* 3600-4800f: The lesson */}
      <Sequence from={3600} durationInFrames={1200}>
        <AbsoluteFill style={{ padding: 100 }}>
           <div style={{ fontSize: 40, color: COLORS.cyan, fontWeight: 700, marginBottom: 40 }}>The Context Engineered Approach</div>
           <CodeBlock code={`buildContext({\n  codebase: findDependencies('basket.ts'),\n  history: getVCSHistory('basket.ts'),\n  production: getMonitoringData('basket.ts'),\n  constraints: ['never null prices', 'no global state'],\n  risks: assessLiability('pricing-logic')\n});`} />
           <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 40 }}>
              {['Finds all 47 deps', 'Understands history', 'Respects production data'].map((text, i) => (
                <div key={i} style={{ 
                  fontSize: 24, 
                  color: COLORS.success, 
                  opacity: fadeIn(frame - 3600, fps, 0.5, 300 + i * 60),
                  transform: `translateX(${interpolate(fadeIn(frame - 3600, fps, 0.5, 300 + i * 60), [0, 1], [-20, 0])}px)`
                }}>
                  ✅ {text}
                </div>
              ))}
           </div>
        </AbsoluteFill>
      </Sequence>

      {/* 4800-5400f: Statistics */}
      <Sequence from={4800} durationInFrames={600}>
        <AbsoluteFill style={{ backgroundColor: COLORS.darkBg, padding: 100 }}>
           <div style={{ fontSize: 40, color: COLORS.textPrimary, fontWeight: 700, marginBottom: 50, textAlign: 'center' }}>Refactoring Success Rate</div>
           <BarChart 
             maxValue={100}
             data={[
               { label: 'AI without Context', value: 23, color: COLORS.error },
               { label: 'AI with Context Engineering', value: 89, color: COLORS.cyan },
             ]}
           />
           <div style={{ textAlign: 'center', marginTop: 40 }}>
             <KineticText text="3.9x improvement with context engineering." fontSize={32} color={COLORS.cyan} type="reveal" />
           </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}
;
