import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { COLORS, SPRING_CONFIGS } from '../../lib/constants';
import { ChapterTitle, QuoteBlock, SplitLayout } from './shared';
import { ChatBubble, CodeBlock } from '../../components/ui';
import { KineticText } from '../../components/ui/KineticText';

export const Scene09_Tactics = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* Stage 1: 0-300 (18773-19073) "how do we apply this?" */}
      {frame < 300 && (
        <ChapterTitle 
            number="09" 
            title="Practical Tactics" 
            subtitle="Context engineering for everyone." 
        />
      )}

      {/* Stage 2: 300-1200 (19073-19973) Tactic 1: Explore before prompt */}
      {frame >= 300 && frame < 1200 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, padding: 80, height: '100%' }}>
            <KineticText text="Tactic 1: Explore First" fontSize={60} color={COLORS.cyan} type="reveal" />
            
            <SplitLayout
                left={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ color: COLORS.error, fontSize: 24, fontWeight: 800 }}>THE "HELP" LOOP ❌</div>
                        <ChatBubble message="HELP!! TypeError: Cannot read 'map' of undefined. [Pasts 1000 lines of code]" />
                        <div style={{ fontSize: 18, color: COLORS.textMuted }}>Result: Confusion & Hallucinations</div>
                    </div>
                }
                right={
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                        <div style={{ color: COLORS.success, fontSize: 24, fontWeight: 800 }}>MISE EN PLACE ✅</div>
                        {['1. Find relevant files', '2. Read only necessary blocks', '3. Identify core assumptions', '4. Provide focused context'].map((step, i) => (
                            <div key={i} style={{ 
                                padding: '15px 25px', 
                                backgroundColor: COLORS.darkCard, 
                                border: `1px solid ${COLORS.success}40`, 
                                borderRadius: 12,
                                color: 'white',
                                opacity: interpolate(frame, [350 + i * 30, 380 + i * 30], [0, 1], { extrapolateRight: 'clamp' }),
                                transform: `translateX(${interpolate(frame, [350 + i * 30, 380 + i * 30], [20, 0], { extrapolateRight: 'clamp' })}px)`
                            }}>
                                {step}
                            </div>
                        ))}
                   </div>
                }
            />
        </div>
      )}

      {/* Stage 3: 1200-2100 (19973-20873) Tactic 2: Reference, don't describe */}
      {frame >= 1200 && frame < 2100 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, padding: 80, height: '100%' }}>
            <KineticText text="Tactic 2: Reference, Don't Describe" fontSize={60} color={COLORS.cyan} type="reveal" />
            
            <SplitLayout
                left={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ color: COLORS.error, fontSize: 24, fontWeight: 800 }}>VAGUE DESCRIPTION ❌</div>
                        <ChatBubble isAgent message="Fix the indentation in the entire file." />
                        <div style={{ color: COLORS.textMuted, fontStyle: 'italic' }}>AI is guessing...</div>
                    </div>
                }
                right={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ color: COLORS.success, fontSize: 24, fontWeight: 800 }}>EXACT REFERENCE ✅</div>
                        <ChatBubble message="See src/lib/db.ts lines 42-65. Follow that pattern exactly." />
                        <div style={{ opacity: interpolate(frame, [1300, 1330], [0, 1]) }}>
                            <CodeBlock 
                                code={`export const useDb = () => {\n  // THE PATTERN\n}`} 
                                language="typescript"
                            />
                        </div>
                    </div>
                }
            />
        </div>
      )}

      {/* Stage 4: 2100-3000 (20873-21773) Tactic 3: The Clean Room */}
      {frame >= 2100 && frame < 3000 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60 }}>
            <KineticText text="Tactic 3: The Clean Room" fontSize={60} color={COLORS.cyan} type="reveal" />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 100 }}>🗑️</div>
                    <div style={{ color: COLORS.textMuted }}>Old Chat History</div>
                </div>
                <div style={{ fontSize: 60, color: COLORS.cyan }}>→</div>
                <div style={{ textAlign: 'center', transform: `scale(${spring({ frame: frame - 2200, fps, config: SPRING_CONFIGS.bouncy })})` }}>
                    <div style={{ fontSize: 100 }}>✨</div>
                    <div style={{ color: COLORS.success, fontWeight: 800 }}>FRESH SESSION</div>
                </div>
                <div style={{ fontSize: 60, color: COLORS.cyan }}>→</div>
                <div style={{ textAlign: 'center', transform: `scale(${spring({ frame: frame - 2300, fps, config: SPRING_CONFIGS.bouncy })})` }}>
                    <div style={{ fontSize: 100 }}>📋</div>
                    <div style={{ color: COLORS.cyan }}>PASTE PLAN</div>
                </div>
            </div>
            
            <QuoteBlock 
                text="When the conversation gets heavy, summarize, start a new chat, and paste the plan. Reset the attention pie."
                color={COLORS.cyan}
            />
        </div>
      )}

      {/* Stage 5: 3000-3531 (21773-22304) The 5-Layer Stack */}
      {frame >= 3000 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 40, padding: 80 }}>
            <KineticText text="The 5-Layer Context Stack" fontSize={60} color={COLORS.cyan} type="reveal" />
            
            <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 10, width: '500px' }}>
                {['IDENTITY', 'KNOWLEDGE', 'EXAMPLES', 'CONSTRAINTS', 'TOOLS'].map((layer, i) => (
                    <div key={layer} style={{ 
                        padding: '20px', 
                        backgroundColor: COLORS.darkCard, 
                        border: `2px solid ${COLORS.cyan}`, 
                        borderRadius: 12,
                        textAlign: 'center',
                        color: COLORS.cyan,
                        fontWeight: 900,
                        fontSize: 24,
                        opacity: interpolate(frame, [3100 + i * 15, 3120 + i * 15], [0, 1], { extrapolateRight: 'clamp' }),
                        transform: `scale(${interpolate(frame, [3100 + i * 15, 3120 + i * 15], [0.8, 1], { extrapolateRight: 'clamp' })})`
                    }}>
                        {layer}
                    </div>
                ))}
            </div>
            
            <div style={{ marginTop: 20, fontSize: 32, fontWeight: 800, color: 'white' }}>
                We aren't prompt engineers. We are context architects.
            </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
