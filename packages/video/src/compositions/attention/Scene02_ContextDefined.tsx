import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../../lib/constants';
import { fadeIn } from '../../lib/animations';
import { ChapterTitle, QuoteBlock, SplitLayout } from './shared';
import { BarChart } from '../../components/ui';
import { KineticText } from '../../components/ui/KineticText';

export const Scene02_ContextDefined = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Stage 1: 0-360 (1358-1718) "taking this interview seriously" */}
      {frame < 360 && (
        <ChapterTitle
            number="02"
            title="Context Engineering"
            subtitle="It's not about the words."
            delay={0}
        />
      )}

      {/* Stage 2: 360-860 (1718-2218) Comparison table */}
      {frame >= 360 && frame < 860 && (
        <div style={{ padding: '80px 100px', display: 'flex', flexDirection: 'column', gap: 40 }}>
            <KineticText text="Prompting vs. Engineering" fontSize={76} color={COLORS.cyan} type="reveal" />

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 40,
                opacity: fadeIn(frame - 360, fps, 0.5, 20)
            }}>
                {/* Prompt Engineering (Old) */}
                <div style={{
                    padding: 40,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: 24,
                    border: `1px solid ${COLORS.darkBorder}`,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ fontSize: 40, fontWeight: 800, color: COLORS.textMuted, marginBottom: 30, textDecoration: 'line-through' }}>Prompt Engineering</div>
                    <ul style={{ color: COLORS.textMuted, fontSize: 30, listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <li>• Crafting the perfect request</li>
                        <li>• Wordsmithing</li>
                        <li>• Magic phrases</li>
                        <li>• Trial and error</li>
                    </ul>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(10,10,15,0.4)', zIndex: 1 }} />
                </div>

                {/* Context Engineering (New) */}
                <div style={{
                    padding: 40,
                    backgroundColor: 'rgba(0,229,255,0.05)',
                    borderRadius: 24,
                    border: `2px solid ${COLORS.cyan}`,
                    boxShadow: `0 0 40px ${COLORS.cyan}20`
                }}>
                    <div style={{ fontSize: 40, fontWeight: 800, color: COLORS.cyan, marginBottom: 30 }}>Context Engineering</div>
                    <ul style={{ color: COLORS.textPrimary, fontSize: 30, listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <li>• Assembling the right information</li>
                        <li>• Systems thinking</li>
                        <li>• Architecture</li>
                        <li>• Deterministic results</li>
                    </ul>
                </div>
            </div>
        </div>
      )}

      {/* Stage 3: 860-1360 (2218-2718) Detective analogy / Memory container */}
      {frame >= 860 && frame < 1360 && (
        <SplitLayout
            left={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
                    <div style={{
                        width: 300,
                        height: 300,
                        borderRadius: '50%',
                        border: `4px solid ${COLORS.cyan}`,
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: 'rgba(0,0,0,0.3)'
                    }}>
                        {/* Token blocks filling up */}
                        {Array.from({ length: 15 }).map((_, i) => {
                            const t = frame - 860 - i * 5;
                            const y = interpolate(t, [0, 40], [300, 200 - i * 15], { extrapolateRight: 'clamp' });
                            const opacity = interpolate(t, [0, 10], [0, 1]);
                            return (
                                <div key={i} style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 50 + (i % 3) * 60,
                                    width: 50,
                                    height: 20,
                                    backgroundColor: i > 10 ? COLORS.error : COLORS.cyan,
                                    opacity,
                                    transform: `translateY(${-y}px)`,
                                    borderRadius: 4
                                }} />
                            );
                        })}
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 600, color: COLORS.cyan }}>WORKING MEMORY</div>
                </div>
            }
            right={
                <QuoteBlock
                    text="Think of it as a detective story: assemble all the evidence before you start the interrogation."
                    author="Zoltan Erdos"
                    delay={20}
                />
            }
        />
      )}

      {/* Stage 4: 1360-2064 (2718-3422) Lowering IQ */}
      {frame >= 1360 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60, padding: 100 }}>
            <QuoteBlock
                text="If you feed an AI too much information, you're effectively lowering its IQ."
                color={COLORS.error}
            />

            <BarChart
                data={[
                    { label: "Optimal Context", value: 98, color: COLORS.cyan },
                    { label: "Oversized Context", value: 65, color: COLORS.warning },
                    { label: "Information Overload", value: 35, color: COLORS.error }
                ]}
                maxValue={100}
                height={300}
                delay={40}
            />

            <div style={{ fontSize: 30, color: COLORS.textMuted, fontFamily: 'Inter, sans-serif' }}>
                AI PERFORMANCE vs. CONTEXT SIZE
            </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
