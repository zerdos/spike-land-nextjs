import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Smart Video Wall Display - Multi-Stream WebRTC Application",
  description: "Transform multiple mobile devices into a synchronized video wall display using WebRTC technology. Perfect for events, digital signage, and interactive installations.",
};

export default function DisplayAppPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Smart Video Wall Display
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          Transform any screen into a dynamic multi-stream display. Connect multiple mobile devices instantly via QR code to create stunning video walls for events, presentations, and digital signage.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/apps/display/run">
              Launch Display
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/apps/display/client">
              Join as Client
            </Link>
          </Button>
        </div>
      </div>

      {/* Screenshot Gallery Section */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>Visual Experience</CardTitle>
          <CardDescription>
            See the Smart Video Wall in action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground">Video Wall Demo Screenshot</span>
            </div>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground">Mobile Client Interface</span>
            </div>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground">Multi-Stream Layout</span>
            </div>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground">QR Code Connection</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dynamic Video Wall</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Automatically arranges multiple video streams into an optimal grid layout. Supports unlimited concurrent connections with smart scaling.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">WebRTC Technology</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Peer-to-peer connections ensure low latency and high-quality video streaming. No server infrastructure required for media relay.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Real-Time Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Instant connection and disconnection handling. Smooth transitions as clients join or leave the display session.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mobile Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Full support for 4G/5G networks with TURN server configuration. Works seamlessly across all modern mobile browsers.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Use Cases Section */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>Perfect For</CardTitle>
          <CardDescription>
            Versatile applications across various scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Events & Conferences</h3>
              <p className="text-sm text-muted-foreground">
                Create immersive multi-angle displays for live events, allowing attendees to contribute their perspectives.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Digital Signage</h3>
              <p className="text-sm text-muted-foreground">
                Transform any display into dynamic digital signage with content from multiple sources.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Security Monitoring</h3>
              <p className="text-sm text-muted-foreground">
                Monitor multiple camera feeds simultaneously on a single display with automatic layout optimization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>Technical Specifications</CardTitle>
          <CardDescription>
            Built with modern web technologies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Core Technologies</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• WebRTC for peer-to-peer video streaming</li>
                  <li>• PeerJS for simplified WebRTC implementation</li>
                  <li>• Next.js 15 with React Server Components</li>
                  <li>• TypeScript for type-safe development</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Display Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Automatic grid layout optimization</li>
                  <li>• Dynamic aspect ratio handling</li>
                  <li>• Smooth animations and transitions</li>
                  <li>• Full-screen support</li>
                </ul>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Network Configuration</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• STUN servers for NAT traversal</li>
                  <li>• TURN servers for relay fallback</li>
                  <li>• Support for 4G/5G mobile networks</li>
                  <li>• Automatic reconnection handling</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Client Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• QR code for instant connection</li>
                  <li>• Camera selection and controls</li>
                  <li>• Connection status indicators</li>
                  <li>• Mobile-optimized interface</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>How to Get Started</CardTitle>
          <CardDescription>
            Set up your video wall in three simple steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              1
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold">Launch the Display</h4>
              <p className="text-sm text-muted-foreground">
                Click &quot;Launch Display&quot; to open the video wall on your main screen. The display will generate a unique session ID and QR code.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              2
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold">Connect Clients</h4>
              <p className="text-sm text-muted-foreground">
                Scan the QR code with mobile devices or share the session link. Each client can choose their camera and grant permissions.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              3
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold">Enjoy Your Video Wall</h4>
              <p className="text-sm text-muted-foreground">
                Watch as video streams automatically arrange into an optimal grid. Add or remove clients anytime with seamless transitions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center mt-12">
        <h2 className="text-2xl font-bold mb-4">Ready to Create Your Video Wall?</h2>
        <p className="text-muted-foreground mb-6">
          Transform your display into a dynamic multi-stream experience
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/apps/display/run">
              Launch Display Now
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/apps/display/client">
              Connect as Client
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}