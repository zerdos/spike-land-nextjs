'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DisplayRunnerPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [displayStatus, setDisplayStatus] = useState<'initializing' | 'ready' | 'running'>('initializing');

  useEffect(() => {
    // Simulate initialization
    const timer = setTimeout(() => {
      setDisplayStatus('ready');
    }, 1000);

    // Check fullscreen status
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const handleLaunchDisplay = () => {
    setDisplayStatus('running');
    // In a real implementation, this would initialize the WebRTC display
    // For now, we'll redirect to the actual display page
    window.location.href = '/display';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Controls */}
      {!isFullscreen && (
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/apps/display">
                  <Button variant="ghost" size="sm">
                    ← Back to Display App
                  </Button>
                </Link>
                <h1 className="text-xl font-semibold">Display Runner</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFullscreen}
                >
                  {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                </Button>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    displayStatus === 'running' ? 'bg-green-500 animate-pulse' :
                    displayStatus === 'ready' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`} />
                  <span className="text-sm text-muted-foreground capitalize">
                    {displayStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Display Area */}
      <div className={`flex items-center justify-center ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-73px)]'}`}>
        {displayStatus === 'running' ? (
          // Placeholder for actual display functionality
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-lg">Redirecting to display...</span>
            </div>
          </div>
        ) : (
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                Smart Video Wall Display Controller
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Section */}
              <div className="bg-muted rounded-lg p-6">
                <h3 className="font-semibold mb-3">Display Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">System Status:</span>
                    <span className={`text-sm font-medium ${
                      displayStatus === 'ready' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {displayStatus === 'ready' ? 'Ready to Launch' : 'Initializing...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">WebRTC Support:</span>
                    <span className="text-sm font-medium text-green-600">Available</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Camera Access:</span>
                    <span className="text-sm font-medium text-muted-foreground">Not Required</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Screen Mode:</span>
                    <span className="text-sm font-medium">
                      {isFullscreen ? 'Fullscreen' : 'Windowed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-4">
                <h3 className="font-semibold">Quick Start Instructions</h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      1
                    </span>
                    <span>
                      Click &quot;Launch Display&quot; to start the video wall application
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      2
                    </span>
                    <span>
                      A QR code will appear for clients to scan and connect
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      3
                    </span>
                    <span>
                      Video streams will automatically arrange in an optimal grid layout
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      4
                    </span>
                    <span>
                      Use fullscreen mode for the best viewing experience
                    </span>
                  </li>
                </ol>
              </div>

              {/* Display Options */}
              <div className="space-y-4">
                <h3 className="font-semibold">Display Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Layout Mode</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatic grid optimization based on connected clients
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Connection Type</h4>
                    <p className="text-sm text-muted-foreground">
                      WebRTC peer-to-peer with TURN/STUN support
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Quality Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Adaptive bitrate based on network conditions
                    </p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Max Connections</h4>
                    <p className="text-sm text-muted-foreground">
                      Unlimited (performance varies by device)
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center pt-4">
                <Button
                  size="lg"
                  onClick={handleLaunchDisplay}
                  disabled={displayStatus !== 'ready'}
                  className="min-w-[200px]"
                >
                  {displayStatus === 'ready' ? 'Launch Display' : 'Initializing...'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleFullscreen}
                >
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
                </Button>
              </div>

              {/* Tips */}
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Pro Tip:</strong> For the best experience, use a large display or projector
                  in fullscreen mode. The video wall will automatically adapt to your screen resolution
                  and aspect ratio.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fullscreen Exit Button */}
      {isFullscreen && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleFullscreen}
            className="shadow-lg"
          >
            Exit Fullscreen (Esc)
          </Button>
        </div>
      )}
    </div>
  );
}