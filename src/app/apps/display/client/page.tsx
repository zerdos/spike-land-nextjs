'use client';

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ClientPageContent() {
  const searchParams = useSearchParams();
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [displayId, setDisplayId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Extract parameters from URL
    const paramDisplayId = searchParams.get('displayId');
    const paramRoomId = searchParams.get('roomId');
    const paramSessionId = searchParams.get('sessionId');

    if (paramDisplayId) {
      setDisplayId(paramDisplayId);
    }
    if (paramRoomId) {
      setRoomId(paramRoomId);
    }
    if (paramSessionId) {
      setSessionId(paramSessionId);
    }
  }, [searchParams]);

  const handleConnect = useCallback(() => {
    if (!displayId && !roomId && !sessionId) {
      setErrorMessage('No connection parameters provided. Please scan a QR code or use a valid link.');
      return;
    }

    setConnectionStatus('connecting');
    setErrorMessage('');

    // Simulate connection attempt
    setTimeout(() => {
      // In a real implementation, this would redirect to the client page
      // For now, we'll redirect to the actual client implementation
      const targetUrl = displayId ? `/client?displayId=${displayId}` : '/client';
      window.location.href = targetUrl;
    }, 1500);
  }, [displayId, roomId, sessionId]);

  const handleManualEntry = () => {
    const id = prompt('Enter Display ID, Room ID, or Session ID:');
    if (id) {
      setDisplayId(id);
      setErrorMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/apps/display">
                <Button variant="ghost" size="sm">
                  ← Back to Display App
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">Join Display</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                connectionStatus === 'failed' ? 'bg-red-500' :
                'bg-gray-500'
              }`} />
              <span className="text-sm text-muted-foreground capitalize">
                {connectionStatus === 'idle' ? 'Not Connected' : connectionStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Join as Client</CardTitle>
            <CardDescription>
              Connect your device to an active display session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connection Parameters */}
            {(displayId || roomId || sessionId) && (
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <h3 className="font-semibold mb-2">Connection Details</h3>
                {displayId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Display ID:</span>
                    <span className="text-sm font-mono">{displayId}</span>
                  </div>
                )}
                {roomId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Room ID:</span>
                    <span className="text-sm font-mono">{roomId}</span>
                  </div>
                )}
                {sessionId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Session ID:</span>
                    <span className="text-sm font-mono">{sessionId}</span>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-4">
                <p className="text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-4">
              <h3 className="font-semibold">How to Connect</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                    1
                  </span>
                  <div>
                    <p className="font-medium text-foreground mb-1">Scan QR Code</p>
                    <p>Use your device camera to scan the QR code displayed on the main screen</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                    2
                  </span>
                  <div>
                    <p className="font-medium text-foreground mb-1">Grant Permissions</p>
                    <p>Allow camera access when prompted to share your video stream</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                    3
                  </span>
                  <div>
                    <p className="font-medium text-foreground mb-1">Start Streaming</p>
                    <p>Your video will automatically appear on the display wall</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Requirements */}
            <div className="space-y-4">
              <h3 className="font-semibold">Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-1">Browser Support</h4>
                  <p className="text-xs text-muted-foreground">
                    Chrome, Safari, Edge, or Firefox (latest versions)
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-1">Camera Access</h4>
                  <p className="text-xs text-muted-foreground">
                    Required for video streaming
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-1">Network</h4>
                  <p className="text-xs text-muted-foreground">
                    WiFi, 4G, or 5G connection
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-1">JavaScript</h4>
                  <p className="text-xs text-muted-foreground">
                    Must be enabled in browser
                  </p>
                </div>
              </div>
            </div>

            {/* Connection Actions */}
            <div className="space-y-4">
              {displayId || roomId || sessionId ? (
                <div className="flex gap-4">
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={handleConnect}
                    disabled={connectionStatus === 'connecting'}
                  >
                    {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect to Display'}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      setDisplayId('');
                      setRoomId('');
                      setSessionId('');
                      setErrorMessage('');
                      setConnectionStatus('idle');
                    }}
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    No connection parameters detected. Please scan a QR code or enter an ID manually.
                  </p>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleManualEntry}
                  >
                    Enter ID Manually
                  </Button>
                </div>
              )}
            </div>

            {/* Alternative Options */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Alternative Options</h3>
              <div className="space-y-3">
                <Link href="/display" className="block">
                  <Button variant="outline" className="w-full">
                    Launch Your Own Display
                  </Button>
                </Link>
                <Link href="/apps/display" className="block">
                  <Button variant="ghost" className="w-full">
                    Learn More About Smart Video Wall
                  </Button>
                </Link>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> For best results, ensure you have good lighting and a stable internet
                connection. The video quality will automatically adjust based on your network speed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium text-sm mb-1">Camera not working?</h4>
              <p className="text-xs text-muted-foreground">
                Check browser permissions in Settings → Privacy → Camera
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Connection failed?</h4>
              <p className="text-xs text-muted-foreground">
                Ensure the display is still active and try refreshing the page
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">Poor video quality?</h4>
              <p className="text-xs text-muted-foreground">
                Move closer to your WiFi router or switch to a less congested network
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">QR code not scanning?</h4>
              <p className="text-xs text-muted-foreground">
                Try increasing screen brightness or enter the Display ID manually
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ClientJoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    }>
      <ClientPageContent />
    </Suspense>
  );
}