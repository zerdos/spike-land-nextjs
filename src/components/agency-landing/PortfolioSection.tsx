"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const projects = [
  {
    title: "Pixel",
    subtitle: "AI Photo Enhancement",
    description:
      "Transform ordinary photos into stunning images with one click. Powered by Gemini AI.",
    stats: ["Sub-second processing", "Zero quality loss", "Batch support"],
    href: "/pixel",
    gradient: "from-pink-500 to-rose-500",
    status: "live",
  },
  {
    title: "Vibe Coding",
    subtitle: "Build Apps Without the BS",
    description:
      "Write a single TypeScript file. Deploy instantly. Edit on mobile. Ship 5x faster than traditional development.",
    stats: ["Real-time preview", "Works on any device", "Claude Code integration"],
    href: "/my-apps",
    gradient: "from-cyan-500 to-blue-500",
    status: "live",
  },
  {
    title: "Orbit",
    subtitle: "AI Social Command Center",
    description:
      "Manage all your social accounts from one intelligent dashboard. AI-powered scheduling, analytics, and engagement.",
    stats: ["5+ platforms", "AI-powered drafts", "24/7 monitoring"],
    href: "#orbit",
    gradient: "from-purple-500 to-indigo-500",
    status: "coming",
  },
];

export function PortfolioSection() {
  return (
    <section className="bg-zinc-950 py-24" id="portfolio">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Proof, Not Promises
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Real products we've built and shipped.
          </p>
        </motion.div>

        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-3">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50"
            >
              {/* Gradient header */}
              <div
                className={`h-32 bg-gradient-to-br ${project.gradient} opacity-80 transition-opacity group-hover:opacity-100`}
              />

              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">{project.title}</h3>
                  {project.status === "coming"
                    ? (
                      <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-400">
                        Coming Soon
                      </span>
                    )
                    : (
                      <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
                        Live
                      </span>
                    )}
                </div>
                <p className="mt-1 text-sm text-cyan-400">{project.subtitle}</p>
                <p className="mt-3 text-zinc-400">{project.description}</p>

                <ul className="mt-4 space-y-1">
                  {project.stats.map((stat) => (
                    <li key={stat} className="flex items-center gap-2 text-sm text-zinc-500">
                      <span className="h-1 w-1 rounded-full bg-cyan-500" />
                      {stat}
                    </li>
                  ))}
                </ul>

                <Link
                  href={project.href}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-cyan-400 transition-colors hover:text-cyan-300"
                >
                  {project.status === "coming" ? "Learn More" : "Try It"}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
