import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, SPRING_CONFIGS } from '../../lib/constants';
import { ChapterTitle, SplitLayout, QuoteBlock } from './shared';
import { CodeBlock } from '../../components/ui';
import { KineticText } from '../../components/ui/KineticText';

export const Scene03_PlanMode: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const keyboardPress = spring({
    frame: frame - 20,
    fps,
    config: SPRING_CONFIGS.snappy,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* Stage 1: 0-300 (3422-3722) "start right there, Plan Mode" */}
      {frame < 300 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <ChapterTitle 
                number="03" 
                title="Plan Mode" 
                subtitle="Shift+Tab Changes Everything." 
            />
            <div style={{ display: 'flex', gap: 20, marginTop: 60 }}>
                {['SHIFT', 'TAB'].map((key) => (
                    <div 
                        key={key}
                        style={{
                            padding: '30px 60px',
                            backgroundColor: COLORS.darkCard,
                            border: `2px solid ${COLORS.cyan}`,
                            borderRadius: 16,
                            fontSize: 48,
                            fontWeight: 900,
                            color: COLORS.cyan,
                            boxShadow: `0 0 30px ${COLORS.cyan}40`,
                            transform: `scale(${interpolate(keyboardPress, [0, 1], [1, 0.9])})`,
                        }}
                    >
                        {key}
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Stage 2 & 3: 300-1300 (3722-4722) "shifted gears" / "contextual handcuffs" */}
      {frame >= 300 && frame < 1300 && (
        <AbsoluteFill>
            <div style={{ padding: 80, display: 'flex', flexDirection: 'column', gap: 40, height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <KineticText text="MODE SWITCH" fontSize={40} color={COLORS.cyan} type="reveal" />
                    <div style={{ 
                        padding: '10px 30px', 
                        backgroundColor: COLORS.error, 
                        borderRadius: 8, 
                        color: 'white', 
                        fontWeight: 'bold',
                        animation: 'pulse 1s infinite'
                    }}>
                        RESTRICTED
                    </div>
                </div>

                <SplitLayout
                    left={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.textPrimary }}>CAN DO:</div>
                            <div style={{ color: COLORS.success, fontSize: 24 }}>✓ Read Local Files</div>
                            <div style={{ color: COLORS.success, fontSize: 24 }}>✓ Search Codebase</div>
                            <div style={{ color: COLORS.success, fontSize: 24 }}>✓ Architect Strategy</div>
                            
                            <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.textPrimary, marginTop: 20 }}>CANNOT DO:</div>
                            <div style={{ color: COLORS.error, fontSize: 24 }}>✗ Write Code</div>
                            <div style={{ color: COLORS.error, fontSize: 24 }}>✗ Delete Files</div>
                            <div style={{ color: COLORS.error, fontSize: 24 }}>✗ Execute Shell</div>
                        </div>
                    }
                    right={
                        <CodeBlock 
                            code={`"You are STRICTLY PROHIBITED \nfrom creating, modifying, \nor deleting files.\n\nYou have total amnesia."`}
                            language="markdown"
                            delay={20}
                        />
                    }
                />
            </div>
        </AbsoluteFill>
      )}

      {/* Stage 4: 1300-1872 (4722-5294) Forces model to explore */}
      {frame >= 1300 && frame < 1872 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                {['EXPLORE', 'PLAN', 'CODE'].map((step, i) => (
                    <React.Fragment key={step}>
                        <div style={{ 
                            padding: '30px 50px', 
                            backgroundColor: frame >= 1300 + i * 40 ? COLORS.cyan : COLORS.darkCard,
                            border: `2px solid ${COLORS.cyan}`,
                            borderRadius: 16,
                            color: frame >= 1300 + i * 40 ? COLORS.darkBg : COLORS.cyan,
                            fontSize: 32,
                            fontWeight: 800,
                            transition: 'all 0.3s ease'
                        }}>
                            {step}
                        </div>
                        {i < 2 && <div style={{ fontSize: 40, color: COLORS.cyan }}>→</div>}
                    </React.Fragment>
                ))}
            </div>
            <QuoteBlock 
                text="Constraints create better behavior. By removing the ability to act, you force the ability to think."
                delay={80}
            />
        </div>
      )}

      {/* Stage 5: 1872-2472 (5294-5894) Plan is context-engineered prompt */}
      {frame >= 1872 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 80 }}>
            <div style={{ 
                position: 'relative',
                padding: '60px',
                backgroundColor: COLORS.darkCard,
                borderRadius: 24,
                border: `3px solid ${COLORS.cyan}`,
                boxShadow: `0 0 60px ${COLORS.cyan}30`,
                transform: `rotate(-2deg)`
            }}>
                <div style={{ fontSize: 24, color: COLORS.cyan, marginBottom: 20, fontFamily: 'monospace' }}>plan.md</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'white' }}>TECHNICAL STRATEGY</div>
                <div style={{ marginTop: 20, color: COLORS.textSecondary }}>• Reference src/lib/auth.ts:42</div>
                <div style={{ color: COLORS.textSecondary }}>• Update checkPermission() logic</div>
                
                <div style={{ 
                    position: 'absolute', 
                    top: -40, 
                    right: -40, 
                    fontSize: 80,
                    animation: 'float 3s ease-in-out infinite' 
                }}>
                    💡
                </div>
            </div>

            <QuoteBlock 
                text="The plan output is a context-engineered prompt for the next AI instance."
                color={COLORS.fuchsia}
            />
        </div>
      )}
    </AbsoluteFill>
  );
};
