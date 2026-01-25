import { BarChart3, Brain, Calendar, Rocket, SplitSquareVertical } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Features - Spike Land | AI-Powered Social Media Tools",
  description:
    "Discover Spike Land's powerful features: A/B Testing, AI Calendar, Brand Brain, and Analytics. Everything you need to dominate social media.",
  openGraph: {
    title: "Features - Spike Land | AI-Powered Social Media Tools",
    description:
      "Discover Spike Land's powerful features: A/B Testing, AI Calendar, Brand Brain, and Analytics.",
    type: "website",
  },
};

const features = [
  {
    href: "/features/ab-testing",
    title: "A/B Testing",
    description:
      "Optimize your content with data-driven insights. Test headlines, images, and posting times to maximize engagement.",
    icon: SplitSquareVertical,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    href: "/features/calendar",
    title: "AI Calendar",
    description:
      "Smart scheduling powered by AI. Automatically find the best times to post and never miss your content schedule.",
    icon: Calendar,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    href: "/features/brand-brain",
    title: "Brand Brain",
    description:
      "Your AI brand guardian. Maintain consistent voice, tone, and messaging across all your social channels.",
    icon: Brain,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    href: "/features/analytics",
    title: "Analytics",
    description:
      "Deep performance insights across all platforms. Track growth, engagement, and ROI in one unified dashboard.",
    icon: BarChart3,
    gradient: "from-orange-500 to-red-500",
  },
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Powerful Features for
            <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
              {" "}Social Media Success
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Everything you need to create, schedule, and optimize your social media presence with
            AI-powered tools.
          </p>
          <Link
            href="/orbit"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            <Rocket className="h-5 w-5" />
            Get Started with Orbit
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
              />
              <div className="relative z-10">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} p-3 mb-6`}
                >
                  <feature.icon className="w-full h-full text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
                <span className="inline-flex items-center mt-4 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more
                  <svg
                    className="ml-2 w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="inline-block rounded-2xl border border-border bg-card/50 p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to transform your social media?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start growing your audience with AI-powered social media tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/orbit"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                <Rocket className="h-5 w-5" />
                Start Free Trial
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold border border-border hover:bg-muted transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
