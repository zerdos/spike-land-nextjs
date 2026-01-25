import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeCard } from "../shared/ThemeCard";

export function TestimonialCards() {
  const testimonials = [
    {
      quote: "Rapid prototyping with AI assistance - exactly what modern development needs.",
      author: "Design Vision",
      role: "What developers say",
    },
    {
      quote: "MCP server integration opens up endless possibilities for custom AI workflows.",
      author: "Technical Goal",
      role: "What we're building",
    },
    {
      quote: "Professional vibe coding that balances creativity with robust architecture.",
      author: "Our Mission",
      role: "What we believe",
    },
  ];

  return (
    <SectionWrapper className="bg-[var(--landing-secondary)]/20">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-[var(--landing-heading-weight)] mb-4">
          What we're building
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <ThemeCard key={i} className="flex flex-col justify-between">
            <p className="text-lg italic mb-6 text-[var(--landing-muted-fg)]">
              "{t.quote}"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--landing-primary)]/20 flex items-center justify-center text-[var(--landing-primary)] font-bold">
                {t.author[0]}
              </div>
              <div>
                <div className="font-bold">{t.author}</div>
                <div className="text-sm text-[var(--landing-muted-fg)]">
                  {t.role}
                </div>
              </div>
            </div>
          </ThemeCard>
        ))}
      </div>
    </SectionWrapper>
  );
}
