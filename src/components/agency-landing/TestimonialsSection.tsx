"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Testimonial {
  id: number;
  content: string;
  author: {
    name: string;
    role: string;
    avatarUrl?: string;
    initials: string;
  };
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    content:
      "Working with this agency was a game-changer for our brand. They understood our vision perfectly and delivered a product that exceeded our expectations.",
    author: {
      name: "Sarah Johnson",
      role: "Marketing Director, TechFlow",
      initials: "SJ",
    },
  },
  {
    id: 2,
    content:
      "The attention to detail and creative approach brought our project to life in ways we never imagined. Highly recommended for any growing business.",
    author: {
      name: "Michael Chen",
      role: "CEO, StartUp Inc.",
      initials: "MC",
    },
  },
  {
    id: 3,
    content:
      "Professional, timely, and incredibly talented. The new design has significantly improved our user engagement and conversion rates.",
    author: {
      name: "Emily Davis",
      role: "Product Manager, Creative Solutions",
      initials: "ED",
    },
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
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
    },
  },
};

export function TestimonialsSection({ className }: { className?: string; }) {
  return (
    <section className={cn("py-16 sm:py-24 bg-muted/30", className)}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Trusted by Industry Leaders
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Don't just take our word for it. Here's what our clients have to say about their
            experience working with us.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-8 md:grid-cols-3"
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.id}
              variants={itemVariants}
              className="flex flex-col justify-between rounded-2xl bg-card p-8 shadow-sm border border-border/50"
            >
              <blockquote className="mb-6 text-muted-foreground">
                "{testimonial.content}"
              </blockquote>
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={testimonial.author.avatarUrl} alt={testimonial.author.name} />
                  <AvatarFallback>{testimonial.author.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.author.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.author.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
