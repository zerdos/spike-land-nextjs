"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Coins,
  Download,
  Image as ImageIcon,
  Layers,
  Settings,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "AI-Powered Enhancement",
    description:
      "Advanced machine learning models analyze and enhance every pixel of your image for stunning results.",
  },
  {
    icon: <Layers className="h-6 w-6" />,
    title: "Multiple Resolutions",
    description:
      "Choose from 1K, 2K, or 4K output resolutions to match your needs, from web to print quality.",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Fast Processing",
    description:
      "Get your enhanced images in seconds, not minutes. Our optimized pipeline delivers quick results.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Secure & Private",
    description:
      "Your images are encrypted and automatically deleted after processing. Your data stays yours.",
  },
  {
    icon: <Download className="h-6 w-6" />,
    title: "Easy Downloads",
    description:
      "Download your enhanced images instantly in high quality. No watermarks, no restrictions.",
  },
  {
    icon: <Coins className="h-6 w-6" />,
    title: "Pay As You Go",
    description:
      "Flexible token-based pricing. Only pay for what you use with no monthly commitments.",
  },
  {
    icon: <ImageIcon className="h-6 w-6" />,
    title: "All Image Types",
    description:
      "Works with portraits, landscapes, products, architecture, and more. One tool for all your needs.",
  },
  {
    icon: <Settings className="h-6 w-6" />,
    title: "Simple Controls",
    description:
      "No complex settings or sliders. Upload your image, choose quality, and enhance. It's that easy.",
  },
];

export function FeatureShowcase() {
  const iconColors = [
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "bg-gradient-to-br from-orange-500 to-red-500",
    "bg-gradient-to-br from-green-500 to-emerald-500",
    "bg-gradient-to-br from-indigo-500 to-purple-500",
    "bg-gradient-to-br from-yellow-500 to-orange-500",
    "bg-gradient-to-br from-pink-500 to-rose-500",
    "bg-gradient-to-br from-cyan-500 to-blue-500",
  ];

  return (
    <section className="bg-muted/30 py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Why Choose Our AI Enhancement
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Powerful features designed to make image enhancement simple and effective
          </p>
        </div>

        <div className="mx-auto max-w-6xl grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
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
