"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { AlignLeft } from "lucide-react";
import { useEffect, useState } from "react";

interface Section {
  id: string;
  label: string;
}

interface TableOfContentsProps {
  sections: Section[];
}

export function TableOfContents({ sections }: TableOfContentsProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show TOC after hero
      if (window.scrollY > 600) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      // Detect active section
      const offsets = sections.map(s => {
        const el = document.getElementById(s.id);
        return { id: s.id, offset: el?.offsetTop || 0 };
      });

      const current = [...offsets].reverse().find(s => window.scrollY >= s.offset - 300);
      if (current) {
        setActiveSection(current.id);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({
        top: el.offsetTop,
        behavior: "smooth",
      });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden xl:block"
        >
          <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-4 w-48 shadow-2xl">
            <div className="flex items-center gap-2 mb-4 text-zinc-400 text-xs font-bold uppercase tracking-widest pl-2">
              <AlignLeft size={12} />
              <span>Contents</span>
            </div>
            <ul className="space-y-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollTo(section.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200",
                      activeSection === section.id
                        ? "bg-white/10 text-white font-medium pl-4"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
                    )}
                  >
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
