"use client";

import { motion } from "framer-motion";

const services = [
  {
    icon: "🤖",
    title: "AI Integration & Automation",
    description:
      "Connect LLMs to your existing systems. Build agents that actually work. Automate the tedious stuff.",
    features: [
      "Custom AI agents & chatbots",
      "Workflow automation",
      "OpenAI, Anthropic, Google APIs",
    ],
  },
  {
    icon: "⚡",
    title: "Rapid Prototyping",
    description:
      "Got an idea? We'll have a working prototype in days. Our vibe-coding approach ships 5x faster than traditional development.",
    features: ["MVP in 1-2 weeks", "Mobile-first web apps", "Real-time collaboration"],
  },
  {
    icon: "🛠️",
    title: "Full-Stack Development",
    description:
      "Production-ready applications built with modern tech. TypeScript, Next.js, React - battle-tested at scale.",
    features: ["Scalable architecture", "100% test coverage", "Enterprise-grade security"],
  },
  {
    icon: "📱",
    title: "AI-Powered Products",
    description: "We don't just consult - we build. Products like Pixel prove we ship real value.",
    features: ["End-to-end development", "Concept to launch", "Ongoing support"],
  },
];

export function ServicesSection() {
  return (
    <section className="bg-zinc-950 py-24" id="services">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What We Build
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            From quick prototypes to production systems - we've got you covered.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-all hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="mb-4 text-4xl">{service.icon}</div>
              <h3 className="text-xl font-semibold text-white">{service.title}</h3>
              <p className="mt-2 text-zinc-400">{service.description}</p>
              <ul className="mt-4 space-y-2">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-zinc-500">
                    <svg
                      className="h-4 w-4 text-cyan-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
