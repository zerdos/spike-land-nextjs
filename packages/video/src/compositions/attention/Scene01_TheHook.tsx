import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, staticFile } from 'remotion';
import { COLORS } from '../../lib/constants';
import { fadeIn } from '../../lib/animations';
import { AlertCard, SplitLayout } from './shared';
import { GlitchText, CodeBlock } from '../../components/ui';
import { KineticText } from '../../components/ui/KineticText';
import { SpikeLandLogo } from '../../components/branding/SpikeLandLogo';

export const Scene01_TheHook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Stage 1: 6-270 "I saw a headline..." */}
      {frame >= 6 && frame < 270 && (
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: 240 }}>
            <AlertCard
                title="SITUATION REPORT"
                subtitle="Someone interviewed a piece of software."
                type="info"
                delay={20}
            />
            <div style={{ marginTop: 50 }}>
                <GlitchText text="INTERVIEWED" fontSize={88} isGlitching glitchIntensity={3} delay={40} />
            </div>
        </AbsoluteFill>
      )}

      {/* Stage 2: 270-570 "author claimed they sat down..." */}
      {frame >= 270 && frame < 570 && (
        <SplitLayout
            left={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 40 }}>
                    <div style={{ fontSize: 200, opacity: 0.8 }}>👤</div>
                    <div style={{ fontSize: 80 }}>🎙️</div>
                </div>
            }
            right={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <CodeBlock
                        code={`// Claude Code Terminal\n$ chat --interview\n\nConnecting to Opus 4.6...\n[OK] Ready for questioning.`}
                        language="bash"
                        delay={10}
                    />
                </div>
            }
        />
      )}

      {/* Stage 3: 570-1000 "asked it point-blank..." */}
      {frame >= 570 && frame < 1000 && (
        <AbsoluteFill style={{ padding: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ marginBottom: 40 }}>
                <KineticText text="SYSTEM PROMPT REVEALED" fontSize={50} color={COLORS.cyan} type="reveal" />
            </div>
            <CodeBlock
                code={`"You are strictly prohibited from creating, \nmodifying, or deleting files.\n\nYour ONLY goal is to research and plan \nthe technical approach."`}
                language="markdown"
                delay={20}
            />
        </AbsoluteFill>
      )}

      {/* Stage 4: 1000-1358 "How Claude Code Engineers Context..." */}
      {frame >= 1000 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 40 }}>
            <KineticText text="How Claude Code" fontSize={110} color={COLORS.cyan} type="reveal" delay={0} />
            <KineticText text="Engineers Context" fontSize={110} color={COLORS.cyan} type="reveal" delay={20} />
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
                <KineticText text="Interview with Opus 4.6" fontSize={56} color={COLORS.fuchsia} type="slide" direction="bottom" delay={40} />
                <div style={{ opacity: fadeIn(frame - 1000, fps, 1, 60), display: 'flex', alignItems: 'center', gap: 24 }}>
                    <Img
                        src={staticFile('images/zoltan-erdos.png')}
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `3px solid ${COLORS.cyan}`,
                            boxShadow: `0 0 20px ${COLORS.cyan}40`,
                        }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ color: COLORS.textPrimary, fontSize: 36, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>Zoltan Erdos</span>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <span style={{ color: COLORS.cyan, fontSize: 20, fontFamily: 'monospace' }}>linkedin.com/in/zerdos</span>
                            <span style={{ color: COLORS.textMuted, fontSize: 20 }}>|</span>
                            <span style={{ color: COLORS.cyan, fontSize: 20, fontFamily: 'monospace' }}>github.com/zerdos</span>
                        </div>
                    </div>
                    <SpikeLandLogo size={50} showWordmark={false} />
                </div>
            </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
