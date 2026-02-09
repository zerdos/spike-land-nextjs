import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS, SPRING_CONFIGS } from '../../lib/constants';
import { ChapterTitle, SplitLayout, QuoteBlock } from './shared';
import { KineticText } from '../../components/ui/KineticText';

export const Scene06_TokenEconomics = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Stage 1: 0-300 (10933-11233) "not just about attention, it's about cost" */}
      {frame < 300 && (
        <ChapterTitle
            number="06"
            title="Economics of Tokens"
            subtitle="Reading vs Writing"
        />
      )}

      {/* Stage 2: 300-800 (11233-11733) Input vs Output cost */}
      {frame >= 300 && frame < 800 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60 }}>
            <KineticText text="The Price of Creation" fontSize={76} color={COLORS.cyan} type="reveal" />

            <div style={{ display: 'flex', gap: 60, alignItems: 'center' }}>
                <div style={{
                    padding: 40,
                    backgroundColor: 'rgba(0,229,255,0.05)',
                    borderRadius: 24,
                    border: `2px solid ${COLORS.cyan}`,
                    textAlign: 'center',
                    transform: `scale(${spring({ frame: frame - 350, fps, config: SPRING_CONFIGS.bouncy })})`
                }}>
                    <div style={{ fontSize: 30, color: COLORS.cyan, marginBottom: 10 }}>INPUT (Reading)</div>
                    <div style={{ fontSize: 60, fontWeight: 900, color: 'white' }}>$5/M</div>
                    <div style={{ fontSize: 22, color: COLORS.textMuted, marginTop: 10 }}>CHEAP / PARALLEL</div>
                </div>

                <div style={{ fontSize: 76, color: COLORS.textMuted }}>vs</div>

                <div style={{
                    padding: 40,
                    backgroundColor: 'rgba(255,0,255,0.05)',
                    borderRadius: 24,
                    border: `2px solid ${COLORS.fuchsia}`,
                    textAlign: 'center',
                    transform: `scale(${spring({ frame: frame - 400, fps, config: SPRING_CONFIGS.bouncy })})`
                }}>
                    <div style={{ fontSize: 30, color: COLORS.fuchsia, marginBottom: 10 }}>OUTPUT (Writing)</div>
                    <div style={{ fontSize: 60, fontWeight: 900, color: 'white' }}>$25/M</div>
                    <div style={{ fontSize: 22, color: COLORS.textMuted, marginTop: 10 }}>5X COST / SEQUENTIAL</div>
                </div>
            </div>
        </div>
      )}

      {/* Stage 3: 800-1400 (11733-12333) Parallel vs Sequential */}
      {frame >= 800 && frame < 1400 && (
        <SplitLayout
            left={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                    <div style={{ fontSize: 40, fontWeight: 700, color: COLORS.cyan }}>PRE-FILL (Reading)</div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(10, 1fr)',
                        gap: 10,
                        width: '400px',
                        opacity: interpolate(frame, [850, 860], [0.3, 1])
                    }}>
                        {Array.from({ length: 50 }).map((_, i) => (
                            <div key={i} style={{
                                width: 20,
                                height: 20,
                                backgroundColor: COLORS.cyan,
                                borderRadius: 4,
                                boxShadow: frame >= 860 ? `0 0 10px ${COLORS.cyan}` : 'none'
                            }} />
                        ))}
                    </div>
                    <div style={{ color: COLORS.textSecondary, marginTop: 20, fontSize: 26 }}>ALL AT ONCE</div>
                </div>
            }
            right={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                    <div style={{ fontSize: 40, fontWeight: 700, color: COLORS.fuchsia }}>DECODE (Writing)</div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(10, 1fr)',
                        gap: 10,
                        width: '400px'
                    }}>
                        {Array.from({ length: 50 }).map((_, i) => {
                            const active = frame >= 900 + i * 4;
                            return (
                                <div key={i} style={{
                                    width: 20,
                                    height: 20,
                                    backgroundColor: active ? COLORS.fuchsia : COLORS.darkBorder,
                                    borderRadius: 4,
                                    boxShadow: active ? `0 0 10px ${COLORS.fuchsia}` : 'none'
                                }} />
                            );
                        })}
                    </div>
                    <div style={{ color: COLORS.textSecondary, marginTop: 20, fontSize: 26 }}>ONE BY ONE</div>
                </div>
            }
        />
      )}

      {/* Stage 4: 1400-2000 (12333-12833) Photo vs Painting */}
      {frame >= 1400 && frame < 2000 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 40, padding: 80 }}>
            <QuoteBlock
                text="Reading is like glancing at a photo; generating is like painting it pixel by pixel."
                author="Zoltan Erdos"
            />

            <SplitLayout
                left={
                   <div style={{
                       width: '100%',
                       height: '300px',
                       backgroundColor: COLORS.darkCard,
                       borderRadius: 16,
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       fontSize: 100,
                       opacity: interpolate(frame, [1450, 1460], [0, 1])
                   }}>
                       🖼️
                   </div>
                }
                right={
                    <div style={{
                        width: '100%',
                        height: '300px',
                        backgroundColor: COLORS.darkCard,
                        borderRadius: 16,
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            fontSize: 100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: '100%'
                        }}>
                            🎨
                        </div>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: interpolate(frame, [1500, 1900], [0, 100], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }) + '%',
                            width: '100%',
                            height: '100%',
                            backgroundColor: COLORS.darkCard
                        }} />
                    </div>
                }
            />
        </div>
      )}

      {/* Stage 5: 2000-2378 (12833-13311) Effort Inversion */}
      {frame >= 2000 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60, padding: 100 }}>
            <KineticText text="The Effort Inversion" fontSize={76} color={COLORS.cyan} type="reveal" />

            <div style={{ display: 'flex', gap: 100, width: '100%', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 30, color: COLORS.textMuted, marginBottom: 20 }}>OLD WORLD</div>
                    <div style={{ height: 300, width: 80, backgroundColor: COLORS.darkBorder, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse' }}>
                        <div style={{ height: '80%', backgroundColor: COLORS.fuchsia }} />
                        <div style={{ height: '20%', backgroundColor: COLORS.cyan }} />
                    </div>
                    <div style={{ marginTop: 20, fontSize: 26 }}>80% Iteration</div>
                </div>

                <div style={{ fontSize: 76, alignSelf: 'center' }}>→</div>

                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 30, color: COLORS.cyan, marginBottom: 20 }}>NEW WORLD</div>
                    <div style={{ height: 300, width: 80, backgroundColor: COLORS.darkBorder, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse' }}>
                        <div style={{ height: '20%', backgroundColor: COLORS.fuchsia }} />
                        <div style={{ height: '80%', backgroundColor: COLORS.cyan }} />
                    </div>
                    <div style={{ marginTop: 20, fontSize: 26 }}>80% Context</div>
                </div>
            </div>

            <div style={{ fontSize: 30, color: COLORS.cyan, fontWeight: 700, letterSpacing: 2 }}>PROMPT CACHING ENABLES THE SHIFT</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
