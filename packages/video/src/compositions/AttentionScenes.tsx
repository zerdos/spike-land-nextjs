import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, staticFile, Img } from "remotion";
import { COLORS } from "../lib/constants";
import { GradientMesh } from "../components/branding/GradientMesh";
import { TextOverlay } from "../components/ui/TextOverlay";
import { KineticText } from "../components/ui/KineticText";

// Helper for centered text with animation
const CenteredHeader = ({ text, subtext, type = "scale" }: { text: string; subtext?: string; type?: "scale" | "reveal" }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%', 
      opacity,
      zIndex: 10
    }}>
      <KineticText text={text} fontSize={100} color={COLORS.cyan} type={type} />
      {subtext && (
        <div style={{ marginTop: 20 }}>
          <KineticText text={subtext} fontSize={40} color={COLORS.textSecondary} type="slide" direction="bottom" delay={30} />
        </div>
      )}
    </div>
  );
};

const SceneBackground = ({ src, opacity = 0.3 }: { src: string; opacity?: number }) => (
  <AbsoluteFill>
    <Img 
      src={staticFile(src)} 
      style={{ 
        width: '100%', 
        height: '100%', 
        objectFit: 'cover',
        opacity: opacity,
        filter: 'blur(5px) brightness(0.5)'
      }} 
    />
    <GradientMesh animationSpeed={0.01} />
  </AbsoluteFill>
);

export const IntroScene = () => (
  <AbsoluteFill>
    <SceneBackground src="images/youtube_thumbnail_physics_of_attention_v2_1770632505603.png" opacity={0.4} />
    <CenteredHeader 
      text="Context Engineering" 
      subtext="and the Physics of Attention" 
      type="reveal"
    />
  </AbsoluteFill>
);

export const UncertaintyScene = () => {
  return (
    <AbsoluteFill>
      <SceneBackground src="images/scene_refactor_identity_1770634084819.png" />
      <CenteredHeader 
        text="The Great Refactor" 
        subtext="2026: A profession under reconstruction" 
      />
      <div style={{ position: 'absolute', bottom: 150, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <KineticText 
          text="The career progression kind of stopped." 
          fontSize={44} 
          color={COLORS.fuchsia} 
          type="slide" 
          delay={100}
        />
        <KineticText 
          text="Being a developer will be obsolete in two years." 
          fontSize={28} 
          color={COLORS.textMuted} 
          type="reveal"
          delay={150}
        />
      </div>
    </AbsoluteFill>
  );
};

export const ProductivityScene = () => {
  return (
    <AbsoluteFill>
      <SceneBackground src="images/scene_productivity_paradox_1770634100756.png" />
      <CenteredHeader 
        text="The Productivity Paradox" 
        subtext="The faster I code, the slower the team moves." 
      />
      <Sequence from={200}>
        <div style={{ position: 'absolute', top: 250, right: 150, maxWidth: 500 }}>
          <KineticText 
            text="If I do a PR fast, it won't even be looked at until the end of the sprint."
            fontSize={32}
            color={COLORS.cyan}
            type="slide"
            direction="left"
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

export const AISlopScene = () => (
  <AbsoluteFill>
    <SceneBackground src="images/scene_ai_slop_basket_api_v2_1770634125690.png" />
    <TextOverlay 
      text="The AI Slop Confession" 
      subtext="When agents make assumptions you can't verify."
      size="large"
      gradient
    />
    <div style={{ position: 'absolute', top: '65%', width: '100%', textAlign: 'center' }}>
      <KineticText 
        text="The AI takes assumptions on legacy codebase." 
        fontSize={24} 
        color={COLORS.textSecondary}
        type="reveal"
        delay={120}
      />
    </div>
  </AbsoluteFill>
);

export const QualitySkillsScene = () => (
  <AbsoluteFill>
    <SceneBackground src="images/scene_quality_triangle_v2_1770634140682.png" />
    <CenteredHeader 
      text="Quality Triangle Broken" 
      subtext="High quality, fast, AND cheap. Choose all three." 
    />
    <div style={{ position: 'absolute', bottom: '15%', width: '100%', textAlign: 'center' }}>
       <KineticText text="CONTEXT ENGINEERING" fontSize={70} color={COLORS.cyan} type="scale" />
    </div>
  </AbsoluteFill>
);

export const IdentityVisionScene = () => (
  <AbsoluteFill>
    <SceneBackground src="images/scene_identity_passion_v2_1770634156539.png" />
    <CenteredHeader 
      text="A New Hope" 
      subtext="Passionate about programming, powered by AI." 
    />
    <div style={{ position: 'absolute', bottom: 200, width: '100%', textAlign: 'center' }}>
      <KineticText 
        text="I want to be seen as a guy who really loves tech." 
        fontSize={36} 
        color={COLORS.fuchsia}
        type="slide"
        direction="top"
        delay={150}
      />
    </div>
  </AbsoluteFill>
);

export const OutroScene = () => (
  <AbsoluteFill>
    <GradientMesh animationSpeed={0.05} />
    <CenteredHeader 
      text="spike.land" 
      subtext="Your agentic development partner." 
      type="reveal"
    />
  </AbsoluteFill>
);
