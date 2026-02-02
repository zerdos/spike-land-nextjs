"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { AnimatePresence, motion } from "framer-motion";
import { Phone } from "lucide-react";
import { useEffect, useState } from "react";

export function CTABanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero (approx 70% of viewport height)
      const heroHeight = typeof window !== "undefined" ? window.innerHeight * 0.7 : 600;

      if (window.scrollY > heroHeight) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Initial check
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:hidden"
        >
          <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-lg border border-zinc-800/50">
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-white truncate">Ready to scale?</span>
              <span className="text-xs text-zinc-400 truncate">Let's discuss your strategy.</span>
            </div>
            <Button
              asChild
              size="sm"
              className="bg-white text-zinc-950 hover:bg-zinc-200 shrink-0 shadow-sm font-medium"
            >
              <Link href="/book-call">
                <Phone className="mr-2 h-3.5 w-3.5" />
                Book Call
              </Link>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
