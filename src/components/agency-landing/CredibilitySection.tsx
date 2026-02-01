"use client";

import { motion } from "framer-motion";

const experience = [
  { company: "Virgin Media O2", role: "Platform Engineering" },
  { company: "Investec Bank", role: "Financial Systems" },
  { company: "TalkTalk", role: "High-Traffic Web Apps" },
];

const badges = [
  { icon: "🇬🇧", label: "UK Company", sublabel: "SPIKE LAND LTD" },
  { icon: "💻", label: "Open Source", sublabel: "GitHub Contributor" },
  { icon: "⚡", label: "AI-Native", sublabel: "Development" },
];

export function CredibilitySection() {
  return (
    <section className="bg-zinc-900/50 py-24" id="about">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-16 lg:grid-cols-2">
          {/* Left: Bio */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Built by Engineers,
              <br />
              Not Agencies
            </h2>

            <div className="mt-8">
              <h3 className="text-xl font-semibold text-white">Zoltan Erdos</h3>
              <p className="text-cyan-400">Founder & Lead Engineer</p>

              <p className="mt-4 text-zinc-400">
                12+ years building at scale. Computer Science & Mathematics from ELTE Budapest.
              </p>

              <div className="mt-6 space-y-3">
                {experience.map((exp) => (
                  <div key={exp.company} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-cyan-500" />
                    <span className="font-medium text-white">{exp.company}</span>
                    <span className="text-zinc-500">— {exp.role}</span>
                  </div>
                ))}
              </div>

              <blockquote className="mt-8 border-l-2 border-cyan-500 pl-4 italic text-zinc-400">
                "I started SPIKE LAND to prove that solo developers with AI can compete with
                agencies 10x their size. We ship faster, charge less, and build things that actually
                work."
              </blockquote>
            </div>
          </motion.div>

          {/* Right: Trust Badges */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col justify-center"
          >
            <div className="space-y-4">
              {badges.map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <span className="text-3xl">{badge.icon}</span>
                  <div>
                    <p className="font-semibold text-white">{badge.label}</p>
                    <p className="text-sm text-zinc-500">{badge.sublabel}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* GitHub link */}
            <a
              href="https://github.com/zerdos"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              View open source work on GitHub
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
