
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../../lib/constants';
import { ChapterTitle, SplitLayout, QuoteBlock } from './shared';
import { MementoCard, ChatBubble, CodeBlock } from '../../components/ui';
import { KineticText } from '../../components/ui/KineticText';

export const Scene04_MementoMemory = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkBg }}>
      {/* Stage 1: 0-300 (5894-6194) "Why does the next version need a prompt?" */}
      {frame < 300 && (
        <ChapterTitle 
            number="04" 
            title="Zero Memory" 
            subtitle="Every message is a fresh start." 
        />
      )}

      {/* Stage 2: 300-800 (6194-6694) Amnesia / Fresh start loop */}
      {frame >= 300 && frame < 800 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 40 }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: COLORS.fuchsia, marginBottom: 20 }}>TOTAL AMNESIA</div>
            
            <div style={{ position: 'relative', width: '100%', height: '400px' }}>
                {Array.from({ length: 5 }).map((_, i) => {
                    const delay = 300 + i * 60;
                    const opacity = interpolate(frame, [delay, delay + 20, delay + 50, delay + 60], [0, 1, 1, 0]);
                    return (
                        <div key={i} style={{ 
                            position: 'absolute', 
                            top: '50%', 
                            left: '50%', 
                            transform: 'translate(-50%, -50%)',
                            opacity
                        }}>
                            <ChatBubble message="Hello, I'm new here. How can I help?" isAgent />
                        </div>
                    );
                })}
            </div>
            
            <div style={{ color: COLORS.textMuted, fontSize: 24, fontStyle: 'italic' }}>
                Each request is a brand new AI instance.
            </div>
        </div>
      )}

      {/* Stage 3: 800-1400 (6694-7294) AI is the guy with amnesia, plan is the tattoo */}
      {frame >= 800 && frame < 1400 && (
        <SplitLayout
            left={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
                    <MementoCard 
                        text="BUG: src/components/setter.tsx:42\nFix the mapping error." 
                        style="tattoo" 
                        rotation={-5}
                    />
                    <div style={{ fontSize: 28, fontWeight: 600, color: COLORS.cyan }}>THE TATTOO</div>
                </div>
            }
            right={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <QuoteBlock 
                        text="The AI is the guy with amnesia, the plan is the tattoo."
                        author="Zoltan Erdos"
                        delay={20}
                    />
                    <div style={{ opacity: interpolate(frame, [900, 930], [0, 1]) }}>
                        <CodeBlock 
                            code={`# PLAN\n1. Open src/components/setter.tsx\n2. Fix bug at line 42\n3. Verify results`}
                            language="markdown"
                        />
                    </div>
                </div>
            }
        />
      )}

      {/* Stage 4: 1400-1800 (7294-7694) Wipe and wake up */}
      {frame >= 1400 && frame < 1800 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60 }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 60, opacity: interpolate(frame, [1400, 1500], [1, 0]) }}>🔍</div>
                <div style={{ color: COLORS.cyan }}>EXPLORER</div>
            </div>
            
            <div style={{ 
                width: 300, 
                height: 10, 
                backgroundColor: COLORS.darkBorder,
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ 
                    position: 'absolute', 
                    height: '100%', 
                    backgroundColor: COLORS.cyan,
                    width: interpolate(frame, [1400, 1600], [0, 100]) + '%'
                }} />
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 60, opacity: interpolate(frame, [1550, 1650], [0, 1]) }}>💻</div>
                <div style={{ color: COLORS.fuchsia }}>CODER</div>
            </div>
            
            {/* WIPE EFFECT */}
            <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                backgroundColor: 'white',
                opacity: interpolate(frame, [1500, 1515, 1530], [0, 1, 0]),
                zIndex: 100
            }} />
        </div>
      )}

      {/* Stage 5: 1800-2223 (7694-8117) Specificity is key */}
      {frame >= 1800 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 60, padding: 80 }}>
            <KineticText text="Specificity is Mandatory" fontSize={60} color={COLORS.cyan} type="reveal" />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, width: '100%' }}>
                <div style={{ opacity: interpolate(frame, [1850, 1870], [0, 1]) }}>
                    <div style={{ color: COLORS.error, fontSize: 24, marginBottom: 20 }}>❌ VAGUE (Useless)</div>
                    <div style={{ padding: 30, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 16, border: `1px solid ${COLORS.error}`, color: COLORS.textMuted, fontSize: 18 }}>
                        "Fix the bug in the component where the layout breaks on small screens."
                    </div>
                </div>
                
                <div style={{ opacity: interpolate(frame, [1950, 1970], [0, 1]) }}>
                    <div style={{ color: COLORS.success, fontSize: 24, marginBottom: 20 }}>✅ SPECIFIC (Perfect)</div>
                    <CodeBlock 
                        code={`Edit src/lib/ui.tsx:156\nChange flex-direction to 'column'\nwhere width < 768px`}
                        language="typescript"
                    />
                </div>
            </div>
            
            <QuoteBlock 
                text="Assume the AI remembers nothing. If it's not in the prompt, it doesn't exist."
                color={COLORS.cyan}
                delay={40}
            />
        </div>
      )}
    </AbsoluteFill>
  );
};
