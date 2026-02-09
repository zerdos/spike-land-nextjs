import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, SPRING_CONFIGS } from "../lib/constants";
import { GradientMesh } from "../components/branding/GradientMesh";
import { GlitchText } from "../components/ui/GlitchText";
import { TextOverlay } from "../components/ui/TextOverlay";

// Helper for centered text with animation
const CenteredHeader = ({ text, subtext }: { text: string; subtext?: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const scale = spring({ frame, fps, config: SPRING_CONFIGS.smooth });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      opacity,
      transform: `scale(${scale})`,
      zIndex: 10
    }}>
      <h1 style={{ fontSize: 90, fontWeight: 900, textAlign: 'center', marginBottom: 20, color: COLORS.cyan, textShadow: `0 0 20px ${COLORS.cyan}44` }}>{text}</h1>
      {subtext && <p style={{ fontSize: 45, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 800 }}>{subtext}</p>}
    </div>
  );
};

export const IntroScene = () => (
  <AbsoluteFill>
    <GradientMesh animationSpeed={0.02} />
    <CenteredHeader
      text="Context Engineering"
      subtext="and the Physics of Attention"
    />
  </AbsoluteFill>
);

export const UncertaintyScene = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <GradientMesh />
      <CenteredHeader
        text="The Great Refactor"
        subtext="2026: A profession under reconstruction"
      />
      <div style={{ position: 'absolute', bottom: 100, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <GlitchText
          text="The career progression kind of stopped."
          fontSize={40}
          color={COLORS.fuchsia}
          isGlitching={frame > 100}
        />
        <Sequence from={150}>
           <p style={{ fontSize: 24, color: COLORS.textMuted }}>"Being a developer will be obsolete in two years, for sure."</p>
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};

export const ProductivityScene = () => {
  return (
    <AbsoluteFill>
      <GradientMesh />
      <CenteredHeader
        text="The Productivity Paradox"
        subtext="If I do a PR fast, it won't even be looked at until the end of the sprint."
      />
      <Sequence from={200}>
        <div style={{ position: 'absolute', top: 200, right: 100, maxWidth: 400 }}>
          <p style={{ fontSize: 28, fontStyle: 'italic', borderLeft: `4px solid ${COLORS.cyan}`, paddingLeft: 20 }}>
            "I became the most productive that I ever been in my life... unfortunately, at work it's not that easy."
          </p>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

export const AISlopScene = () => (
  <AbsoluteFill>
    <GradientMesh />
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', padding: 100 }}>
       <TextOverlay
        text="The AI Slop Confession"
        subtext="If coding agents are making mistakes, the requirements weren't specified well enough."
        size="large"
        gradient
      />
      <div style={{ marginTop: 40, opacity: 0.7 }}>
        <p style={{ fontSize: 20, textAlign: 'center' }}>"The AI takes assumptions on legacy codebase, and as a new developer, you have no idea what assumptions the agent made."</p>
      </div>
    </div>
  </AbsoluteFill>
);

export const QualitySkillsScene = () => (
  <AbsoluteFill>
    <GradientMesh />
    <CenteredHeader
      text="Quality Triangle Broken"
      subtext="High quality, fast, AND cheap. Choose all three."
    />
    <div style={{ position: 'absolute', top: '15%', width: '100%', textAlign: 'center' }}>
       <GlitchText text="CONTEXT ENGINEERING" fontSize={60} color={COLORS.cyan} isGlitching />
    </div>
  </AbsoluteFill>
);

export const IdentityVisionScene = () => (
  <AbsoluteFill>
    <GradientMesh />
    <CenteredHeader
      text="A New Hope"
      subtext="Passionate about programming, powered by AI."
    />
    <div style={{ position: 'absolute', bottom: 150, width: '100%', textAlign: 'center', opacity: 0.8 }}>
      <p style={{ fontSize: 32 }}>"I want to be seen as a guy who really loves tech, really passionate about programming."</p>
    </div>
  </AbsoluteFill>
);

export const OutroScene = () => (
  <AbsoluteFill>
    <GradientMesh animationSpeed={0.05} />
    <CenteredHeader
      text="spike.land"
      subtext="Your agentic development partner."
    />
  </AbsoluteFill>
);
