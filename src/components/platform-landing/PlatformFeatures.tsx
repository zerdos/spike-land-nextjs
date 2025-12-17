"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Coins, ImageIcon, Layers } from "lucide-react";
import { type ReactNode } from "react";

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Clock className="h-6 w-6" />,
    title: "60-Second Magic",
    description:
      "Upload. Enhance. Download. That's it. No complex settings, no waiting around. Your photo is ready before your coffee.",
  },
  {
    icon: <ImageIcon className="h-6 w-6" />,
    title: "Print-Ready 4K",
    description:
      "Good enough to frame. Finally. Get crystal-clear resolution that looks stunning on any screen or print size.",
  },
  {
    icon: <Layers className="h-6 w-6" />,
    title: "Batch Albums",
    description:
      "Restore 100 photos at once. Perfect for family reunions, wedding albums, or that shoebox of photos from the attic.",
  },
  {
    icon: <Coins className="h-6 w-6" />,
    title: "Free Forever Tier",
    description:
      "Tokens regenerate every 15 minutes. No credit card ever required. Try as many photos as you want, on the house.",
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
            Why Pixel?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            The fastest way to restore your memories. Powered by the latest AI.
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
