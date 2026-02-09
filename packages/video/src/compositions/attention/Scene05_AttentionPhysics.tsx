
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../../lib/constants';
import { ChapterTitle, QuoteBlock } from './shared';
import { AttentionPie, TokenFlow } from '../../components/ui';
import { KineticText } from '../../components/ui/KineticText';

export const Scene05_AttentionPhysics = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      {/* Stage 1: 0-300 (8117-8417) "physics of attention" */}
      {frame < 300 && (
        <ChapterTitle
            number="05"
            title="Physics of Attention"
            subtitle="A hardware reality."
        />
      )}

      {/* Stage 2: 300-800 (8417-8917) Token connections web */}
      {frame >= 300 && frame < 800 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 40 }}>
            <KineticText text="N² Complexity" fontSize={76} color={COLORS.cyan} type="reveal" />
            <TokenFlow
                text="Every token looks at every other token"
                showConnections={true}
                delay={20}
            />
            <div style={{ color: COLORS.textMuted, fontSize: 30 }}>
                In Transformer models, attention is all-to-all.
            </div>
        </div>
      )}

      {/* Stage 3: 800-1400 (8917-9517) HERO VISUAL: Attention Pie */}
      {frame >= 800 && frame < 1400 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60 }}>
            <KineticText text="The Attention Pie" fontSize={76} color={COLORS.cyan} type="reveal" />

            <AttentionPie
                segments={[
                    { label: "Relevant Code", value: interpolate(frame, [900, 1100], [100, 20], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }), color: COLORS.cyan },
                    { label: "Irrelevant Docs", value: interpolate(frame, [900, 1100], [0, 40], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }), color: COLORS.fuchsia },
                    { label: "Conversation Noise", value: interpolate(frame, [900, 1100], [0, 40], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }), color: COLORS.purple },
                ]}
                size={500}
                delay={20}
            />

            <div style={{ fontSize: 30, fontWeight: 600, color: COLORS.fuchsia }}>
                {frame > 1100 ? "SIGNAL DILUTION: -80%" : "OPTIMAL SIGNAL: 100%"}
            </div>
        </div>
      )}

      {/* Stage 4: 1400-2000 (9517-10117) Signal dilution / Noise flood */}
      {frame >= 1400 && frame < 2000 && (
        <AbsoluteFill>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{
                    width: 20,
                    height: 20,
                    backgroundColor: COLORS.cyan,
                    borderRadius: '50%',
                    boxShadow: `0 0 50px ${COLORS.cyan}`,
                    zIndex: 10
                }} />

                {/* Noise particles flooding in */}
                {Array.from({ length: 150 }).map((_, i) => {
                    const startFrame = 1400 + (i * 2);
                    if (frame < startFrame) return null;

                    const angle = (i * 137.5) * (Math.PI / 180);
                    const distance = interpolate(frame, [startFrame, startFrame + 60], [1000, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });
                    const opacity = interpolate(frame, [startFrame, startFrame + 10], [0, 0.4], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' });

                    return (
                        <div key={i} style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            width: 6,
                            height: 6,
                            backgroundColor: COLORS.textMuted,
                            borderRadius: '50%',
                            opacity,
                            transform: `translate(-50%, -50%) translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`
                        }} />
                    );
                })}

                <div style={{ marginTop: 100 }}>
                    <KineticText text="The signal gets completely diluted" fontSize={64} color="white" type="reveal" />
                </div>
            </div>
        </AbsoluteFill>
      )}

      {/* Stage 5: 2000-2816 (10117-10933) Toxic context / Hallucinations */}
      {frame >= 2000 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60, padding: 80 }}>
            <div style={{ fontSize: 100, color: COLORS.error, fontWeight: 900, textAlign: 'center' }}>
                IRRELEVANT CONTEXT IS TOXIC
            </div>

            <QuoteBlock
                text="It's not just extra noise. It's poison. It actively distracts the model from the solution, leading to hallucinations."
                color={COLORS.error}
                delay={40}
            />

            <div style={{ position: 'relative', width: '100%', height: '200px', display: 'flex', justifyContent: 'center' }}>
                {['phantom_function()', 'non_existent_api', 'fake_module_v3'].map((hallucination, i) => (
                    <div key={i} style={{
                        color: COLORS.error,
                        fontSize: 40,
                        fontFamily: 'monospace',
                        opacity: interpolate(Math.sin(frame * 0.1 + i), [-1, 1], [0.1, 0.8]),
                        margin: '0 20px'
                    }}>
                        {hallucination}
                    </div>
                ))}
            </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
