import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Img, staticFile, spring } from 'remotion';
import { COLORS, SPRING_CONFIGS } from '../../lib/constants';
import { fadeIn, slideIn, typewriter } from '../../lib/animations';
import { KineticText } from '../../components/ui/KineticText';
import { GradientMesh } from '../../components/branding/GradientMesh';
import { ProgressBar } from '../../components/ui/ProgressBar';

/**
 * SceneBackground - background image with blur/brightness + GradientMesh
 */
export function SceneBackground({ src, opacity = 0.3, blur = 8, brightness = 0.5, kenBurns = { from: 1.05, to: 1.0 } }: {
  src: string;
  opacity?: number;
  blur?: number;
  brightness?: number;
  kenBurns?: { from: number; to: number };
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  
  const scale = interpolate(
    frame,
    [0, durationInFrames],
    [kenBurns.from, kenBurns.to],
    { extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      <Img 
        src={staticFile(src)} 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          opacity: opacity,
          filter: `blur(${blur}px) brightness(${brightness})`,
          transform: `scale(${scale})`,
        }} 
      />
      <GradientMesh animationSpeed={0.01} />
    </AbsoluteFill>
  );
};

/**
 * QuoteBlock - styled blockquote with left border + typewriter
 */
export function QuoteBlock({ text, author, delay = 0, charsPerSecond = 25, color = COLORS.cyan }: {
  text: string;
  author?: string;
  delay?: number;
  charsPerSecond?: number;
  color?: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const visibleText = typewriter(frame, fps, text, charsPerSecond, delay);
  const opacity = fadeIn(frame, fps, 0.5, delay);
  
  return (
    <div style={{
      opacity,
      borderLeft: `4px solid ${color}`,
      padding: '20px 40px',
      margin: '20px 0',
      backgroundColor: `${COLORS.darkCard}88`,
      borderRadius: '0 12px 12px 0',
      maxWidth: 800,
    }}>
      <p style={{
        fontSize: 32,
        fontStyle: 'italic',
        color: COLORS.textPrimary,
        lineHeight: 1.4,
        margin: 0,
        fontFamily: 'Inter, sans-serif',
      }}>
        "{visibleText}"
      </p>
      {author && visibleText.length === text.length && (
        <div style={{
          marginTop: 15,
          fontSize: 24,
          color: color,
          fontWeight: 600,
          textAlign: 'right',
        }}>
          — {author}
        </div>
      )}
    </div>
  );
};

/**
 * AlertCard - red/amber/fuchsia notification card with slideIn
 */
export function AlertCard({ title, subtitle, type = 'error', delay = 0 }: {
  title: string;
  subtitle?: string;
  type?: 'error' | 'warning' | 'info';
  delay?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const color = type === 'error' ? COLORS.error : type === 'warning' ? COLORS.warning : COLORS.fuchsia;
  const slide = slideIn(frame, fps, 'right', 400, 0.6, delay);
  const opacity = fadeIn(frame, fps, 0.3, delay);

  return (
    <div style={{
      opacity,
      transform: `translateX(${slide}px)`,
      backgroundColor: `${color}15`,
      border: `2px solid ${color}`,
      borderRadius: 16,
      padding: '20px 30px',
      marginBottom: 20,
      width: 450,
      boxShadow: `0 10px 30px rgba(0,0,0,0.3), 0 0 20px ${color}30`,
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, marginBottom: subtitle ? 8 : 0 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 18, color: COLORS.textSecondary }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

/**
 * SkillCard - horizontal card with icon + name + proficiency bar
 */
export function SkillCard({ icon, name, value, color = COLORS.cyan, delay = 0 }: {
  icon: string;
  name: string;
  value: number; // 0-100
  color?: string;
  delay?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const slide = slideIn(frame, fps, 'left', 100, 0.5, delay);
  const opacity = fadeIn(frame, fps, 0.3, delay);
  
  return (
    <div style={{
      opacity,
      transform: `translateX(${slide}px)`,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      backgroundColor: `${COLORS.darkCard}aa`,
      padding: '16px 24px',
      borderRadius: 16,
      border: `1px solid ${COLORS.darkBorder}`,
      marginBottom: 16,
      width: 600,
    }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: 20, 
          fontWeight: 600, 
          color: COLORS.textPrimary, 
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>{name}</span>
          <span style={{ color }}>{value}%</span>
        </div>
        <ProgressBar progress={value} color={color} height={10} delay={delay + 20} />
      </div>
    </div>
  );
};

/**
 * ChapterTitle - chapter number + title + subtitle with standard timing
 */
export function ChapterTitle({ number, title, subtitle, delay = 0 }: {
  number: string;
  title: string;
  subtitle?: string;
  delay?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ 
        position: 'absolute', 
        fontSize: 250, 
        fontWeight: 900, 
        color: COLORS.textPrimary, 
        opacity: interpolate(fadeIn(frame, fps, 1, delay), [0, 1], [0, 0.05]),
        zIndex: 0
      }}>
        {number}
      </div>
      <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <KineticText text={title} fontSize={110} color={COLORS.cyan} type="reveal" delay={delay + 10} />
        {subtitle && (
          <div style={{ marginTop: 20 }}>
            <KineticText text={subtitle} fontSize={40} color={COLORS.textSecondary} type="slide" direction="bottom" delay={delay + 40} />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * SplitLayout - Helper for dual-pane layouts
 */
export function SplitLayout({ left, right, gap = 60 }: {
  left: React.ReactNode;
  right: React.ReactNode;
  gap?: number;
}) {
  return (
    <div style={{ 
      display: 'flex', 
      width: '100%', 
      height: '100%', 
      padding: '100px 80px',
      alignItems: 'center',
      gap 
    }}>
      <div style={{ flex: 1 }}>{left}</div>
      <div style={{ flex: 1 }}>{right}</div>
    </div>
  );
}
