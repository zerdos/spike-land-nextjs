"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./scroll-reveal";

export function PricingSection() {
  const tiers = [
    {
      name: "Starter",
      description: "Perfect for MVPs and validating ideas",
      price: "Prototype",
      features: [
        "Rapid prototyping",
        "Basic UI/UX design",
        "Mobile responsive",
        "1 iteration round",
      ],
      buttonText: "Start Prototype",
      variant: "default" as const,
      buttonVariant: "outline" as const,
      popular: false,
    },
    {
      name: "Growth",
      description: "Scale your business with a complete solution",
      price: "Full App",
      features: [
        "Full-stack development",
        "Advanced UI/UX",
        "SEO optimized",
        "3 iteration rounds",
        "Analytics integration",
      ],
      buttonText: "Get Full App",
      variant: "highlighted" as const,
      buttonVariant: "default" as const,
      popular: true,
    },
    {
      name: "Enterprise",
      description: "Tailored solutions for large organizations",
      price: "Custom",
      features: [
        "Custom architecture",
        "Dedicated support",
        "SLA guarantees",
        "Audit logs",
        "SSO integration",
      ],
      buttonText: "Contact Sales",
      variant: "default" as const,
      buttonVariant: "outline" as const,
      popular: false,
    },
  ];

  return (
    <section className="relative py-24 bg-zinc-950">
      <div className="container mx-auto px-4">
        <ScrollReveal className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Pricing Plans
          </Badge>
          <h2 className="text-3xl font-bold font-heading text-white sm:text-4xl mb-4">
            Choose Your Path to{" "}
            <span className="text-gradient-primary">Success</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Transparent pricing tailored to your stage of growth. No hidden
            fees, just results.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <StaggerItem key={tier.name} className="h-full">
              <Card
                variant={tier.variant}
                className={`relative flex flex-col h-full ${
                  tier.popular ? "border-primary/50" : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge
                      variant="default"
                      className="bg-primary text-primary-foreground border-none px-4 py-1"
                    >
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                  <div className="mt-2 mb-4">
                    <span className="text-4xl font-bold text-white">
                      {tier.price}
                    </span>
                  </div>
                  <p className="text-sm text-white/60">{tier.description}</p>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm text-white/80"
                      >
                        <Check className="w-5 h-5 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    variant={tier.buttonVariant}
                    className="w-full"
                    size="lg"
                  >
                    {tier.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
