import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { COLORS, SPRING_CONFIGS } from '../../lib/constants';
import { ChapterTitle, QuoteBlock, SplitLayout } from './shared';
import { ContextWindow, ChatBubble, CodeBlock } from '../../components/ui';
import { KineticText } from '../../components/ui/KineticText';

export const Scene07_CachingRot = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Stage 1: 0-300 (13311-13611) "92% prefix reuse rate" */}
      {frame < 300 && (
        <ChapterTitle
            number="07"
            title="Caching & Context Rot"
            subtitle="Keeping the signal clean."
        />
      )}

      {/* Stage 2: 300-1200 (13611-14511) Static vs Dynamic layers */}
      {frame >= 300 && frame < 1200 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 80, padding: 80 }}>
            <div style={{ flex: 1 }}>
                <KineticText text="The 92% Rule" fontSize={76} color={COLORS.cyan} type="reveal" />
                <div style={{ marginTop: 40, fontSize: 30, lineHeight: 1.5, color: COLORS.textSecondary }}>
                    Most of your context doesn't change from message to message.
                    Prompt caching turns static rules into instant, cheap availability.
                </div>
                <div style={{ marginTop: 40, padding: 20, backgroundColor: 'rgba(34, 197, 94, 0.1)', border: `1px solid ${COLORS.success}`, borderRadius: 12, display: 'inline-block' }}>
                    <span style={{ color: COLORS.success, fontWeight: 800, fontSize: 30 }}>COST REDUCTION: 90%</span>
                </div>
            </div>

            <ContextWindow
                sections={[
                    { label: "DYNAMIC: NEW CHAT", percentage: 0.2, color: COLORS.purple, status: "fresh" },
                    { label: "STATIC: CLAUDE.MD", percentage: 0.3, color: COLORS.cyan, status: "cached" },
                    { label: "STATIC: SYSTEM PROMPT", percentage: 0.5, color: COLORS.darkCard, status: "cached" },
                ]}
                fillLevel={interpolate(frame, [300, 500], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' })}
            />
        </div>
      )}

      {/* Stage 3: 1200-2100 (14511-15411) Context Rot / Gaslighting */}
      {frame >= 1200 && frame < 2100 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 40 }}>
            <div style={{ fontSize: 76, fontWeight: 900, color: COLORS.error }}>CONTEXT ROT</div>

            <div style={{ width: '800px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ChatBubble isAgent message="I'll use getUserDataV2() to fetch that." />
                <div style={{ opacity: interpolate(frame, [1400, 1420], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }), marginLeft: 40 }}>
                    <ChatBubble message="Wait, that function doesn't exist..." />
                </div>
                <div style={{ opacity: interpolate(frame, [1600, 1620], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }) }}>
                    <ChatBubble isAgent message="Actually, getUserDataV2() is defined in your API docs. [HALLUCINATION]" />
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        boxShadow: `inset 0 0 100px ${COLORS.error}40`,
                        pointerEvents: 'none'
                    }} />
                </div>
            </div>

            <QuoteBlock
                text="The AI starts believing its own lies. It gaslights itself using its own history."
                color={COLORS.error}
            />
        </div>
      )}

      {/* Stage 4: 2100-3000 (15411-16311) Compaction / Chainsaw */}
      {frame >= 2100 && frame < 3000 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 80 }}>
            <div style={{ textAlign: 'center' }}>
                <ContextWindow
                    sections={[
                        { label: "NEWEST", percentage: 0.1, color: COLORS.purple, status: "fresh" },
                        { label: "HISTORY", percentage: 0.7, color: COLORS.error, status: "rotting" },
                        { label: "SYSTEM", percentage: 0.2, color: COLORS.darkCard, status: "cached" },
                    ]}
                    fillLevel={interpolate(frame, [2100, 2300], [0.8, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' })}
                />
                <div style={{ marginTop: 20, color: COLORS.error, fontWeight: 'bold', fontSize: 26 }}>83% CAPACITY REFRESH</div>
            </div>

            <div style={{ fontSize: 100, transform: `rotate(${interpolate(frame, [2300, 2500], [0, 90], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' })}deg)` }}>🪚</div>

            <div style={{ textAlign: 'center', opacity: interpolate(frame, [2500, 2600], [0, 1], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }) }}>
                <ContextWindow
                    sections={[
                        { label: "NEWEST", percentage: 0.2, color: COLORS.purple, status: "fresh" },
                        { label: "SUMMARY", percentage: 0.1, color: COLORS.amber, status: "fresh" },
                        { label: "SYSTEM", percentage: 0.7, color: COLORS.darkCard, status: "cached" },
                    ]}
                    fillLevel={0.4}
                />
                <div style={{ marginTop: 20, color: COLORS.success, fontWeight: 'bold', fontSize: 26 }}>CLEAN SUMMARY</div>
            </div>
        </div>
      )}

      {/* Stage 5 & 6: 3000-3852 (16311-17163) Reinjecting the clean stuff */}
      {frame >= 3000 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60, padding: 80 }}>
            <KineticText text="Context Hygiene" fontSize={76} color={COLORS.cyan} type="reveal" />

            <SplitLayout
                left={
                    <div style={{ opacity: 0.4 }}>
                        <div style={{ fontSize: 30, textDecoration: 'line-through', color: COLORS.textMuted }}>Noise & History</div>
                        <ul style={{ color: COLORS.textMuted, fontSize: 26 }}>
                            <li>Typo corrections</li>
                            <li>Failed attempts</li>
                            <li>Small talk</li>
                        </ul>
                    </div>
                }
                right={
                    <div style={{ transform: `scale(${spring({ frame: frame - 3100, fps, config: SPRING_CONFIGS.bouncy })})` }}>
                        <div style={{ fontSize: 30, color: COLORS.cyan, fontWeight: 800 }}>RE-INJECTED ESSENTIALS</div>
                        <CodeBlock
                            code={`- CLAUDE.md (Permanent Rules)\n- current_plan.md (The Tattoo)\n- Relevant code chunks`}
                            language="markdown"
                        />
                    </div>
                }
            />

            <QuoteBlock
                text="Losing the noise, keeping the instructions. This is why CLAUDE.md is the most important file you write."
                color={COLORS.cyan}
            />
        </div>
      )}
    </AbsoluteFill>
  );
};
