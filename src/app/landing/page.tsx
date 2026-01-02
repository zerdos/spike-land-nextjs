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
    <div className="min-h-screen bg-gray-50 py-12 px-6 md:px-12 font-sans">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Landing Page Gallery</h1>
          <p className="text-xl text-gray-600">
            A collection of "vibe coding" landing pages. Hover to interact, click title to view full
            page.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
          {pages.map((page) => (
            <div
              key={page.name}
              className="group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10 relative">
                <Link
                  href={page.path}
                  className="flex items-center gap-2 font-bold text-lg text-gray-900 hover:text-blue-600 transition-colors"
                >
                  {page.name}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600">
                    ↗
                  </span>
                </Link>
                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${page.color}`} />
              </div>

              {/* Preview Container */}
              <div className="relative w-full aspect-[16/10] overflow-hidden bg-gray-100">
                {/* Iframe Wrapper */}
                {
                  /*
                   Scale calculation:
                   We want 25% scale.
                   So width and height should be 400% (100 / 0.25).
                   Top-left origin.
                */
                }
                <div className="absolute inset-0 w-[400%] h-[400%] origin-top-left scale-25 pointer-events-none select-none">
                  <iframe
                    src={page.path}
                    className="w-full h-full border-0"
                    tabIndex={-1}
                    aria-hidden="true"
                    loading="lazy"
                  />
                </div>

                {/* Overlay Link - makes the whole preview clickable */}
                <Link
                  href={page.path}
                  className="absolute inset-0 z-10 block"
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
