"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Newspaper, Tag } from "lucide-react";

const posts = [
  {
    title: "The Future of AI in Social Media Marketing",
    description:
      "Discover how artificial intelligence is reshaping the landscape of social media strategies and audience engagement.",
    category: "AI Trends",
    date: "Oct 12, 2024",
    readTime: "5 min read",
    color: "from-cyan-500/20 to-blue-500/20",
  },
  {
    title: "Maximizing ROI with Data-Driven Campaigns",
    description:
      "Learn the secrets to leveraging analytics and data insights to boost your campaign performance and ROI.",
    category: "Strategy",
    date: "Oct 15, 2024",
    readTime: "7 min read",
    color: "from-fuchsia-500/20 to-purple-500/20",
  },
  {
    title: "Building Authentic Communities in 2025",
    description:
      "Why authenticity matters more than ever and how to foster genuine connections with your audience.",
    category: "Community",
    date: "Oct 20, 2024",
    readTime: "4 min read",
    color: "from-emerald-500/20 to-green-500/20",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

export function BlogPreviewSection() {
  return (
    <section className="relative py-24 sm:py-32 bg-zinc-950 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container relative mx-auto px-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto max-w-6xl"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <motion.div variants={itemVariants} className="flex items-center gap-2 mb-4">
                <span className="p-2 rounded-lg bg-white/5 border border-white/10 text-cyan-400">
                  <Newspaper className="w-5 h-5" />
                </span>
                <span className="text-sm font-medium text-cyan-400">Latest Updates</span>
              </motion.div>

              <motion.h2
                variants={itemVariants}
                className="text-3xl md:text-5xl font-bold text-white mb-6"
              >
                Insights from the <br />
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Spike Land Blog
                </span>
              </motion.h2>

              <motion.p
                variants={itemVariants}
                className="text-lg text-white/60"
              >
                Stay ahead of the curve with expert tips, industry trends, and product updates.
              </motion.p>
            </div>

            <motion.div variants={itemVariants}>
              <Button
                asChild
                variant="outline"
                className="border-white/10 hover:bg-white/5 text-white gap-2 group"
              >
                <Link href="/blog">
                  View all posts
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group relative"
              >
                <Link href="/blog" className="block h-full">
                  <div className="h-full flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1">
                    {/* Gradient Header / Placeholder Image */}
                    <div
                      className={`h-48 w-full bg-gradient-to-br ${post.color} relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />

                      <div className="absolute top-4 left-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-medium text-white/90">
                          <Tag className="w-3 h-3" />
                          {post.category}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 flex flex-col">
                      <div className="flex items-center gap-3 text-sm text-white/40 mb-4">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {post.date}
                        </span>
                        <span>•</span>
                        <span>{post.readTime}</span>
                      </div>

                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                        {post.title}
                      </h3>

                      <p className="text-white/60 text-sm leading-relaxed mb-6 flex-1">
                        {post.description}
                      </p>

                      <div className="flex items-center text-sm font-medium text-white/40 group-hover:text-white transition-colors">
                        Read article{" "}
                        <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
