import { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Sparkles, Upload, Image as ImageIcon, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Image Enhancement - Spike Land',
  description: 'Enhance your images with AI-powered upscaling and quality improvements',
}

export default async function EnhancePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/enhance')
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-primary">
            <Sparkles className="h-8 w-8" />
            <h1 className="text-4xl font-bold">Image Enhancement</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your photos into professional-quality images using AI-powered enhancement
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Upload</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload your image and let our AI analyze it for enhancement opportunities
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Enhance</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose your quality tier and watch as AI enhances your image with perfect focus and lighting
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Compare</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Use our interactive slider to compare original and enhanced versions side-by-side
            </p>
          </Card>
        </div>

        {/* Pricing Tiers */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Enhancement Tiers</h2>
            <p className="text-muted-foreground">
              Choose the perfect quality tier for your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">1K Quality</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">2</span>
                  <span className="text-muted-foreground">tokens</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ 1024x1024 resolution</li>
                <li>✓ Great for social media</li>
                <li>✓ Fast processing</li>
              </ul>
            </Card>

            <Card className="p-6 space-y-4 border-primary">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">2K Quality</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">5</span>
                  <span className="text-muted-foreground">tokens</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ 2048x2048 resolution</li>
                <li>✓ High quality prints</li>
                <li>✓ Professional results</li>
              </ul>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">4K Quality</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">10</span>
                  <span className="text-muted-foreground">tokens</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ 4096x4096 resolution</li>
                <li>✓ Ultra high quality</li>
                <li>✓ Professional grade</li>
              </ul>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Get started by uploading your first image
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/my-apps">
                <Upload className="mr-2 h-5 w-5" />
                Go to My Apps
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/">Learn More</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
