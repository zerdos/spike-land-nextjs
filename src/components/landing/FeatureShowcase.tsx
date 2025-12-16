"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorPlay, Share2, Zap } from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Instant results",
    description: "Upload. Enhance. Done. No subscriptions, no complicated settings.",
  },
  {
    icon: <MonitorPlay className="h-6 w-6" />,
    title: "Slideshow mode",
    description:
      "Put your restored photos on an iPad or fullscreen on your laptop. Instant conversation starter at family gatherings.",
  },
  {
    icon: <Share2 className="h-6 w-6" />,
    title: "Share anywhere",
    description: "Download or share directly to social. Show off what AI can actually do.",
  },
];

export function FeatureShowcase() {
  const iconColors = [
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "bg-gradient-to-br from-orange-500 to-red-500",
  ];

  return (
    <section id="features" className="bg-muted/30 py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Why Pixel?
          </h2>
        </div>

        <div className="mx-auto max-w-4xl grid gap-7 sm:grid-cols-3">
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
