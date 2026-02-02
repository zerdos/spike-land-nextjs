"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "What AI development services do you offer?",
    answer:
      "We specialize in building custom AI agents, intelligent chatbots, and process automation solutions tailored to your business needs. Our team leverages cutting-edge LLMs and robust engineering to deliver scalable and secure AI applications.",
  },
  {
    question: "How much does a typical project cost?",
    answer:
      "Project costs vary depending on complexity and scope. We offer flexible engagement models including fixed-price projects for well-defined scopes and monthly retainers for ongoing development and support. Contact us for a detailed quote.",
  },
  {
    question: "What is the typical timeline for an AI project?",
    answer:
      "A typical MVP (Minimum Viable Product) takes 4-8 weeks to deliver. Complex enterprise solutions may take 3-6 months. We follow an agile methodology with bi-weekly sprints to ensure transparent progress and rapid feedback loops.",
  },
  {
    question: "Do you provide ongoing support and maintenance?",
    answer:
      "Yes, we offer comprehensive post-launch support packages. This includes monitoring, performance optimization, model updates, and bug fixes to ensure your AI solution remains reliable and up-to-date.",
  },
  {
    question: "How do you ensure data privacy and security?",
    answer:
      "Security is our top priority. We implement enterprise-grade security practices including end-to-end encryption, strict access controls, and compliance with GDPR/SOC2 standards. We can also deploy local models to keep your sensitive data within your infrastructure.",
  },
];

export function FAQSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container px-4 md:px-6 mx-auto max-w-4xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-heading text-primary">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            Everything you need to know about our AI development services and process.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string; }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-6 text-left transition-colors hover:bg-muted/50"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-medium text-foreground">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 ml-4"
        >
          <ChevronDown className="w-5 h-5 text-primary" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 text-muted-foreground border-t border-border/50 pt-4">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
