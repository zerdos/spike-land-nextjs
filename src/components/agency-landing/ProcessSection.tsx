"use client";

import { motion } from "framer-motion";
import { Search, Palette, Code, Rocket, LifeBuoy } from "lucide-react";

const steps = [
  {
    id: "discovery",
    title: "Discovery",
    description: "We start by diving deep into your vision, goals, and target audience to build a solid foundation.",
    icon: Search,
  },
  {
    id: "design",
    title: "Design",
    description: "We create intuitive, high-fidelity prototypes and designs that perfectly align with your brand identity.",
    icon: Palette,
  },
  {
    id: "build",
    title: "Build",
    description: "We develop your product using the latest technologies and best practices for performance and scalability.",
    icon: Code,
  },
  {
    id: "ship",
    title: "Ship",
    description: "We handle the deployment process to ensure your product launches smoothly and reaches your users.",
    icon: Rocket,
  },
  {
    id: "support",
    title: "Support",
    description: "We provide ongoing maintenance and support to ensure your product continues to perform perfectly.",
    icon: LifeBuoy,
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

export function ProcessSection() {
  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4"
          >
            Our Process
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            From idea to launch and beyond, we follow a proven workflow to deliver exceptional results.
          </motion.p>
        </div>

        <div className="relative">
          {/* Connecting line for desktop */}
          <div className="hidden lg:block absolute top-12 left-0 w-full h-0.5 bg-border -z-10" />

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid gap-8 md:grid-cols-2 lg:grid-cols-5"
          >
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div 
                  key={step.id} 
                  variants={itemVariants}
                  className="relative flex flex-col items-center text-center group"
                >
                  <div className="relative flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-background border-4 border-muted transition-colors duration-300 group-hover:border-primary">
                    <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="w-10 h-10" />
                    </div>
                    {/* Step number badge */}
                    <div className="absolute -top-2 -right-2 flex items-center justify-center w-8 h-8 rounded-full bg-background border-2 border-muted text-sm font-bold text-muted-foreground group-hover:border-primary group-hover:text-primary transition-colors duration-300">
                      {index + 1}
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
