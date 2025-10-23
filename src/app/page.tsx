"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AppFeatureList, type Feature } from "@/components/apps/app-feature-list"
import {
  Sparkles,
  Code2,
  Monitor,
  QrCode,
  Wifi,
  Smartphone,
  Camera,
  Users,
  Zap,
  Palette,
  Rocket,
  ArrowRight,
  CheckCircle2,
  Globe,
  Shield,
  Cpu,
  GitBranch,
} from "lucide-react"
import Link from "next/link"

export default function Home() {
  const platformFeatures: Feature[] = [
    {
      id: "vibe-coding",
      icon: <Sparkles className="w-5 h-5 text-primary" />,
      title: "Vibe-Coded Development",
      description: "Rapid app creation with AI-powered code generation and intuitive design patterns",
    },
    {
      id: "modern-stack",
      icon: <Code2 className="w-5 h-5 text-primary" />,
      title: "Modern Tech Stack",
      description: "Built with Next.js 15, TypeScript, Tailwind CSS 4, and shadcn/ui components",
    },
    {
      id: "instant-deploy",
      icon: <Rocket className="w-5 h-5 text-primary" />,
      title: "Instant Deployment",
      description: "Push to production in seconds with Vercel integration and automated CI/CD",
    },
    {
      id: "responsive",
      icon: <Smartphone className="w-5 h-5 text-primary" />,
      title: "Mobile-First Design",
      description: "Every app is optimized for all devices with responsive layouts and touch-friendly interfaces",
    },
    {
      id: "performance",
      icon: <Zap className="w-5 h-5 text-primary" />,
      title: "Lightning Fast",
      description: "Server-side rendering, optimized bundles, and edge runtime for blazing performance",
    },
    {
      id: "testing",
      icon: <Shield className="w-5 h-5 text-primary" />,
      title: "100% Test Coverage",
      description: "Comprehensive testing with Vitest and Playwright ensures reliability and quality",
    },
  ]

  const videoWallFeatures: Feature[] = [
    {
      id: "qr-connect",
      icon: <QrCode className="w-5 h-5 text-primary" />,
      title: "QR Code Connection",
      description: "Instant device pairing with simple QR code scanning",
    },
    {
      id: "webrtc",
      icon: <Wifi className="w-5 h-5 text-primary" />,
      title: "WebRTC Streaming",
      description: "Real-time peer-to-peer video streaming with low latency",
    },
    {
      id: "multi-camera",
      icon: <Camera className="w-5 h-5 text-primary" />,
      title: "Multi-Camera Support",
      description: "Switch between front and back cameras seamlessly",
    },
    {
      id: "collaborative",
      icon: <Users className="w-5 h-5 text-primary" />,
      title: "Collaborative Display",
      description: "Multiple users can stream to the same display wall",
    },
  ]

  const claudeFeatures: Feature[] = [
    {
      id: "ai-powered",
      icon: <Cpu className="w-5 h-5 text-primary" />,
      title: "AI-Powered Development",
      description: "Claude Code understands your vision and transforms it into production-ready code",
    },
    {
      id: "best-practices",
      icon: <CheckCircle2 className="w-5 h-5 text-primary" />,
      title: "Best Practices Built-In",
      description: "Automatically follows industry standards, accessibility guidelines, and security patterns",
    },
    {
      id: "iterative",
      icon: <GitBranch className="w-5 h-5 text-primary" />,
      title: "Iterative Refinement",
      description: "Continuously improve and evolve your apps with natural language instructions",
    },
    {
      id: "full-stack",
      icon: <Globe className="w-5 h-5 text-primary" />,
      title: "Full-Stack Capabilities",
      description: "From UI components to API endpoints, Claude Code handles the entire stack",
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary to-primary/50 opacity-75 blur-lg" />
                <div className="relative rounded-full bg-background p-4">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
              </div>
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Spike Land
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              A platform for vibe-coded apps, where ideas transform into polished applications through the magic of Claude Code and modern web technologies.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="text-base">
                <Link href="/apps/display">
                  <Monitor className="mr-2 h-5 w-5" />
                  Try Smart Video Wall
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <a href="https://github.com/zerdos/spike-land-nextjs" target="_blank" rel="noopener noreferrer">
                  <Code2 className="mr-2 h-5 w-5" />
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center mb-12">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Platform Capabilities
            </h2>
            <p className="text-lg text-muted-foreground">
              Built on cutting-edge technologies to deliver exceptional user experiences
            </p>
          </div>
          <AppFeatureList
            features={platformFeatures}
            columns={3}
            layout="grid"
            className="mx-auto max-w-6xl"
          />
        </div>
      </section>

      {/* Featured App Section */}
      <section className="bg-muted/50 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center mb-12">
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Featured App: Smart Video Wall
            </h2>
            <p className="text-lg text-muted-foreground">
              Turn any display into a collaborative video wall with your mobile device
            </p>
          </div>

          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Monitor className="h-6 w-6 text-primary" />
                      </div>
                      Smart Video Wall
                    </CardTitle>
                    <CardDescription className="text-base">
                      A WebRTC-powered application that transforms any screen into a shared display wall.
                      Simply scan a QR code with your mobile device and start streaming instantly.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">No Installation Required</p>
                          <p className="text-sm text-muted-foreground">
                            Works directly in your browser - no apps to download
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">Real-Time Streaming</p>
                          <p className="text-sm text-muted-foreground">
                            Low-latency peer-to-peer connections for smooth video
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">Privacy First</p>
                          <p className="text-sm text-muted-foreground">
                            Direct device-to-device streaming, no cloud recording
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <Button asChild className="flex-1">
                        <Link href="/apps/display">
                          Launch App
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="mb-6 text-xl font-semibold">Key Features</h3>
                <AppFeatureList
                  features={videoWallFeatures}
                  columns={1}
                  layout="list"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Built with Claude Code */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center mb-12">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-3">
                <Palette className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Vibe Coded with Claude Code
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Experience the future of development where natural language meets production-ready code.
              Claude Code transforms your ideas into fully functional applications with testing, deployment, and best practices built-in.
            </p>
          </div>

          <AppFeatureList
            features={claudeFeatures}
            columns={2}
            layout="grid"
            className="mx-auto max-w-4xl"
          />

          <div className="mt-12 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 p-8">
            <div className="mx-auto max-w-3xl text-center">
              <h3 className="mb-4 text-2xl font-semibold">The Vibe Coding Philosophy</h3>
              <p className="mb-6 text-muted-foreground">
                Stop wrestling with boilerplate and configuration. Focus on what your app should do,
                and let Claude Code handle the implementation details. From component architecture to
                deployment pipelines, every aspect is crafted with modern best practices.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center gap-2 rounded-full bg-background px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Type Safety</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-background px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Accessibility</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-background px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Performance</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-background px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Testing</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-background px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>CI/CD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Explore?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg opacity-90">
            Discover the power of vibe-coded applications. Try our Smart Video Wall or dive into the code to see how it&apos;s built.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" variant="secondary" className="text-base">
              <Link href="/apps/display">
                <Rocket className="mr-2 h-5 w-5" />
                Launch Smart Video Wall
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <a href="https://claude.ai" target="_blank" rel="noopener noreferrer">
                <Sparkles className="mr-2 h-5 w-5" />
                Try Claude Code
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
