"use client";

import Link from "next/link";

export default function LandingIndexPage() {
  const pages = [
    { name: "Stripe", path: "/landing/stripe", color: "from-[#635bff] to-[#00d4ff]" },
    { name: "Linear", path: "/landing/linear", color: "from-[#5E6AD2] to-[#b2b2b2]" },
    { name: "Vercel", path: "/landing/vercel", color: "from-black to-gray-600" },
    { name: "Apple", path: "/landing/apple", color: "from-[#0071e3] to-[#2997ff]" },
    { name: "Figma", path: "/landing/figma", color: "from-[#0acf83] to-[#f24e1e]" },
    { name: "Notion", path: "/landing/notion", color: "from-[#37352f] to-[#eb5757]" },
    { name: "Discord", path: "/landing/discord", color: "from-[#5865f2] to-[#eb459e]" },
    { name: "Framer", path: "/landing/framer", color: "from-[#0055ff] to-[#bb5ef9]" },
    { name: "Supabase", path: "/landing/supabase", color: "from-[#3ecf8e] to-[#6366f1]" },
    { name: "Brutalist", path: "/landing/brutalist", color: "from-red-600 to-yellow-400" },
  ];

  return (
    <div className="min-h-screen py-24 px-6 md:px-12 font-sans relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full mix-blend-screen opacity-30" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/20 blur-[120px] rounded-full mix-blend-screen opacity-30" />
      </div>

      <div className="max-w-[1600px] mx-auto z-10 relative">
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 text-foreground tracking-tight">
            Landing Page <span className="text-gradient-primary">Gallery</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl font-light">
            A collection of "vibe coding" landing pages. Hover to interact, click title to view full
            page.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
          {pages.map((page) => (
            <div
              key={page.name}
              className="group flex flex-col glass-card rounded-2xl overflow-hidden shadow-lg hover:shadow-glow-cyan/20 transition-all duration-300 border border-white/5"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-sm z-10 relative">
                <Link
                  href={page.path}
                  className="flex items-center gap-2 font-heading font-bold text-lg text-foreground hover:text-primary transition-colors"
                >
                  {page.name}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary translate-x-[-4px] group-hover:translate-x-0 duration-300">
                    ↗
                  </span>
                </Link>
                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${page.color} shadow-sm`} />
              </div>

              {/* Preview Container */}
              <div className="relative w-full aspect-[16/10] overflow-hidden bg-black/40">
                {/* Iframe Wrapper */}
                <div className="absolute inset-0 w-[400%] h-[400%] origin-top-left scale-25 pointer-events-none select-none grayscale group-hover:grayscale-0 transition-all duration-500 opacity-80 group-hover:opacity-100">
                  <iframe
                    src={page.path}
                    className="w-full h-full border-0"
                    tabIndex={-1}
                    aria-hidden="true"
                    loading="lazy"
                  />
                </div>

                {/* Overlay Link */}
                <Link
                  href={page.path}
                  className="absolute inset-0 z-10 block ring-offset-2 focus:ring-2 ring-primary/50 outline-none rounded-b-2xl"
                  aria-label={`View ${page.name} page`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
