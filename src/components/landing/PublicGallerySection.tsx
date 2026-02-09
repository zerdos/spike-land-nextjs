"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import type { PublicPhoto } from "@/lib/gallery/public-photos";
import { ArrowRight, ImageIcon } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

interface PublicGallerySectionProps {
  photos: PublicPhoto[];
}

export function PublicGallerySection({ photos }: PublicGallerySectionProps) {
  if (photos.length === 0) return null;

  return (
    <section className="relative py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 mb-6"
        >
          <span className="p-2 rounded-xl bg-fuchsia-400/10 border border-fuchsia-400/20 text-fuchsia-400">
            <ImageIcon className="w-5 h-5" />
          </span>
          <span className="text-sm font-semibold tracking-widest uppercase text-fuchsia-400">
            The Pixel Dimension
          </span>
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight"
        >
          Reality,{" "}
          <span className="bg-gradient-to-r from-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
            Refined
          </span>
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl text-zinc-500 mb-16 max-w-2xl font-light"
        >
          Our neural network reconstructs lost details with haunting precision. 
          See the invisible.
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.slice(0, 10).map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ scale: 1.05, zIndex: 10 }}
              className="relative aspect-square rounded-2xl overflow-hidden group shadow-2xl shadow-black/50"
            >
              <Image
                src={photo.enhancedUrl ?? photo.originalUrl}
                alt={photo.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 20vw"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                <p className="text-white text-xs font-semibold tracking-wider uppercase truncate">
                  {photo.name || "Refined Entity"}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <Button
            asChild
            variant="ghost"
            className="text-zinc-400 hover:text-white gap-2 transition-all duration-300"
          >
            <Link href="/pixel">
              Enter the Gallery
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
