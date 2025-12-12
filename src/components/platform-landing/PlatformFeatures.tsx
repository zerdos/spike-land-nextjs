"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Coins, Rocket, Shield } from "lucide-react";
import { type ReactNode } from "react";

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Bot className="h-6 w-6" />,
    title: "AI-Powered Development",
    description:
      "Connect with AI agents that understand your requirements and build production-ready applications tailored to your needs.",
  },
  {
    icon: <Coins className="h-6 w-6" />,
    title: "Flexible Token Economy",
    description:
      "Pay-as-you-go pricing with auto-regenerating tokens. Only pay for what you use, with no monthly commitments required.",
  },
  {
    icon: <Rocket className="h-6 w-6" />,
    title: "Easy Deployment",
    description:
      "Deploy your apps with one click. Get custom domains and scalable infrastructure without any DevOps knowledge.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Secure & Compliant",
    description:
      "Enterprise-grade security with GDPR compliance. Your data is encrypted and protected at all times.",
  },
];

const iconColors = [
  "bg-gradient-to-br from-purple-500 to-pink-500",
  "bg-gradient-to-br from-yellow-500 to-orange-500",
  "bg-gradient-to-br from-blue-500 to-cyan-500",
  "bg-gradient-to-br from-green-500 to-emerald-500",
];

export function PlatformFeatures() {
  return (
    <section className="bg-muted/30 py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Why Spike Land?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Everything you need to build, deploy, and monetize AI-powered applications
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-0 bg-background group hover:scale-[1.02] transition-all"
            >
              <CardHeader className="pb-3">
                <div
                  className={`mb-3 flex h-14 w-14 items-center justify-center rounded-xl ${
                    iconColors[index]
                  } text-white shadow-lg transition-transform group-hover:scale-110`}
                >
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
