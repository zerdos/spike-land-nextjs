import { GradientText } from "../shared/GradientText";
import { SectionWrapper } from "../shared/SectionWrapper";
import { ThemeCard } from "../shared/ThemeCard";

export function FeatureGridCards() {
  const features = [
    {
      title: "Instant Deployment",
      description: "Zero config. Zero build steps. Just write code and see it live instantly.",
      icon: "⚡",
    },
    {
      title: "Monaco Editor",
      description: "Full-featured code editor with IntelliSense, TypeScript support, and more.",
      icon: "📝",
    },
    {
      title: "Photo Blendr",
      description: "Built-in photo manipulation tools powered by WebAssembly.",
      icon: "🍌",
    },
    {
      title: "MCP Server",
      description: "Integrates seamlessly with Claude Desktop for a unified workflow.",
      icon: "🔌",
    },
    {
      title: "Full Stack",
      description: "Frontend, backend, database - all in one cohesive environment.",
      icon: "📚",
    },
    {
      title: "Real-time",
      description: "Collaborate with your team in real-time. Changes sync instantly.",
      icon: "🔄",
    },
  ];

  return (
    <SectionWrapper>
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-[var(--landing-heading-weight)] mb-4">
          Everything you need to <GradientText>ship faster</GradientText>
        </h2>
        <p className="text-xl text-[var(--landing-muted-fg)] max-w-2xl mx-auto">
          Powerful tools designed for the modern developer workflow.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, i) => (
          <ThemeCard key={i} hoverEffect glass className="group">
            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p className="text-[var(--landing-muted-fg)]">
              {feature.description}
            </p>
          </ThemeCard>
        ))}
      </div>
    </SectionWrapper>
  );
}
