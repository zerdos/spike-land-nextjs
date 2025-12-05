"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "What types of images can I enhance?",
    answer:
      "Our AI enhancement works with all common image types including JPEG, PNG, and WebP. It handles portraits, landscapes, product photos, architecture, and more. The AI automatically adjusts its enhancement based on the content of your image for optimal results.",
  },
  {
    question: "How do tokens work?",
    answer:
      "Tokens are our flexible payment system. Each enhancement costs a certain number of tokens based on the output resolution you choose: 1K uses 1 token, 2K uses 2 tokens, and 4K uses 5 tokens. You can purchase token packs anytime, and they never expire.",
  },
  {
    question: "What resolution options are available?",
    answer:
      "We offer three resolution tiers: 1K (1024px), 2K (2048px), and 4K (4096px). The resolution refers to the longest edge of your output image. Choose 1K for web use, 2K for high-quality displays, and 4K for print or professional work.",
  },
  {
    question: "How long does enhancement take?",
    answer:
      "Most images are enhanced in just 5-15 seconds. Complex images or higher resolutions may take slightly longer, but you'll typically have your results in under 30 seconds. You can track progress in real-time on the enhancement page.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. Your images are encrypted during transfer and processing. We automatically delete all uploaded and enhanced images from our servers after 24 hours. We never share your images with third parties or use them for training purposes.",
  },
  {
    question: "Can I get a refund if I'm not satisfied?",
    answer:
      "Yes! If you're not happy with an enhancement result, contact our support team within 7 days and we'll refund the tokens used. We're confident in our AI's quality, but your satisfaction is our priority.",
  },
];

export function FAQ() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center mb-12">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about our image enhancement service
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
