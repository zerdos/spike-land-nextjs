import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../../lib/constants';
import { ChapterTitle, QuoteBlock, SplitLayout } from './shared';
import { ChatBubble, ProgressBar } from '../../components/ui';
import { KineticText } from '../../components/ui/KineticText';

export const Scene08_Metacognition: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* Stage 1: 0-300 (17163-17463) "biggest difference between human and AI intelligence" */}
      {frame < 300 && (
        <ChapterTitle 
            number="08" 
            title="Metacognition" 
            subtitle="Knowing what you don't know." 
        />
      )}

      {/* Stage 2: 300-800 (17463-17963) Human vs AI doubt */}
      {frame >= 300 && frame < 800 && (
        <SplitLayout
            left={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                    <div style={{ fontSize: 40, color: COLORS.success, fontWeight: 800 }}>HUMAN 🧠</div>
                    <ChatBubble message="I think it's in auth.ts... wait, I'm not sure. Let me check first." />
                    <div style={{ color: COLORS.success, fontSize: 18, fontStyle: 'italic' }}>HEALTHY DOUBT</div>
                </div>
            }
            right={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                    <div style={{ fontSize: 40, color: COLORS.error, fontWeight: 800 }}>AI 🤖</div>
                    <ChatBubble isAgent message="Absolutely! I have completed the login logic using the provided v3 API." />
                    <div style={{ color: COLORS.error, fontSize: 18, fontStyle: 'italic' }}>ZERO DOUBT (EVEN WHEN WRONG)</div>
                </div>
            }
        />
      )}

      {/* Stage 3: 800-1200 (17963-18363) Confidence meter stuck at 100% */}
      {frame >= 800 && frame < 1200 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60 }}>
            <KineticText text="The Doubt Mechanism" fontSize={60} color={COLORS.cyan} type="reveal" />
            
            <div style={{ width: '600px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 24 }}>
                    <span style={{ color: COLORS.textSecondary }}>AI CONFIDENCE</span>
                    <span style={{ color: COLORS.error, fontWeight: 800 }}>100%</span>
                </div>
                <ProgressBar 
                    progress={100} 
                    color={COLORS.error} 
                    height={30}
                    delay={20}
                />
            </div>
            
            <div style={{ fontSize: 24, fontStyle: 'italic', color: COLORS.textMuted }}>
                "The model defaults to maximum helpfulness, even without the facts."
            </div>
        </div>
      )}

      {/* Stage 4: 1200-1610 (18363-18773) Code Writer -> Assumption Auditor */}
      {frame >= 1200 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60, padding: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                <div style={{ fontSize: 48, color: COLORS.textMuted, textDecoration: 'line-through' }}>Code Writer</div>
                <div style={{ fontSize: 60, color: COLORS.cyan }}>→</div>
                <div style={{ fontSize: 60, fontWeight: 900, color: COLORS.cyan }}>ASSUMPTION AUDITOR</div>
            </div>
            
            <div style={{ 
                width: '600px', 
                backgroundColor: COLORS.darkCard, 
                borderRadius: 24, 
                border: `1px solid ${COLORS.darkBorder}`,
                padding: 40,
                display: 'flex',
                flexDirection: 'column',
                gap: 20
            }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.cyan, marginBottom: 10 }}>AUDIT CHECKLIST</div>
                {['Does this file actually exist?', 'Is this API real or a hallucination?', 'Does this plan solve the root cause?'].map((item, i) => (
                    <div 
                        key={i} 
                        style={{ 
                            fontSize: 22, 
                            color: 'white',
                            opacity: interpolate(frame, [1250 + i * 20, 1270 + i * 20], [0, 1], { extrapolateRight: 'clamp' }),
                            transform: `translateX(${interpolate(frame, [1250 + i * 20, 1270 + i * 20], [-20, 0], { extrapolateRight: 'clamp' })}px)`
                        }}
                    >
                        ☐ {item}
                    </div>
                ))}
            </div>

            <QuoteBlock 
                text="The biggest difference between us and AI is metacognition. We know what we don't know."
                color={COLORS.cyan}
            />
        </div>
      )}
    </AbsoluteFill>
  );
};
