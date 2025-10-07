'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Menu,
  X,
  ZoomIn,
  SwitchCamera,
  Mic,
  MicOff,
  MonitorUp,
  Video,
  VideoOff,
  AlertCircle
} from 'lucide-react';
import Peer, { MediaConnection } from 'peerjs';
import { getIceServers } from '@/lib/webrtc/config';

type CameraFacingMode = 'user' | 'environment';

interface MediaTrackCapabilities {
  zoom?: {
    min: number;
    max: number;
    step: number;
  };
}

interface ErrorState {
  message: string;
  type: 'permission' | 'camera' | 'connection' | 'general';
}

function ClientPageContent() {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

  const [displayId, setDisplayId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>('environment');
  const [zoom, setZoom] = useState<number>(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 4 });
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get displayId from URL
  useEffect(() => {
    const id = searchParams.get('displayId');
    if (id) {
      setDisplayId(id);
    } else {
      setError({
        message: 'No display ID provided. Please scan a QR code from a display.',
        type: 'general'
      });
      setIsLoading(false);
    }
  }, [searchParams]);

  // Detect device type and set default camera
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    setFacingMode(isMobile ? 'environment' : 'user');

    // Load saved preference
    const saved = localStorage.getItem('preferredCamera');
    if (saved === 'user' || saved === 'environment') {
      setFacingMode(saved);
    }
  }, []);

  // Request camera access
  const startCamera = useCallback(async (mode: CameraFacingMode) => {
    try {
      setError(null);

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check zoom support
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities() as MediaTrackCapabilities;

        if (capabilities.zoom) {
          setZoomSupported(true);
          setZoomRange({
            min: capabilities.zoom.min,
            max: capabilities.zoom.max
          });
          setZoom(capabilities.zoom.min);
        } else {
          setZoomSupported(false);
        }
      }

      setIsLoading(false);
      return stream;
    } catch (err) {
      console.error('Camera access error:', err);

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError({
            message: 'Camera permission denied. Please allow camera access and reload.',
            type: 'permission'
          });
        } else if (err.name === 'NotFoundError') {
          setError({
            message: 'No camera found on this device.',
            type: 'camera'
          });
        } else {
          setError({
            message: `Camera error: ${err.message}`,
            type: 'camera'
          });
        }
      }

      setIsLoading(false);
      throw err;
    }
  }, []);

  // Initialize camera and PeerJS connection
  useEffect(() => {
    if (!displayId) return;

    let mounted = true;

    const init = async () => {
      try {
        // Start camera
        const stream = await startCamera(facingMode);

        if (!mounted) return;

        // Initialize PeerJS with TURN servers for 4G/5G support
        const peer = new Peer({
          config: {
            iceServers: getIceServers()
          }
        });

        peerRef.current = peer;

        peer.on('open', (id) => {
          console.log('Peer connected with ID:', id);

          // Call the display
          if (stream) {
            const call = peer.call(displayId, stream);
            callRef.current = call;

            call.on('stream', () => {
              console.log('Connected to display');
              setIsConnected(true);
              setError(null);
            });

            call.on('close', () => {
              console.log('Call closed');
              setIsConnected(false);
            });

            call.on('error', (err) => {
              console.error('Call error:', err);
              setError({
                message: 'Connection to display failed. Please try again.',
                type: 'connection'
              });
              setIsConnected(false);
            });
          }
        });

        peer.on('error', (err) => {
          console.error('Peer error:', err);
          setError({
            message: 'Failed to establish peer connection. Please check your internet.',
            type: 'connection'
          });
        });

      } catch (err) {
        console.error('Initialization error:', err);
      }
    };

    init();

    return () => {
      mounted = false;

      // Cleanup
      if (callRef.current) {
        callRef.current.close();
      }

      if (peerRef.current) {
        peerRef.current.destroy();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [displayId, facingMode, startCamera]);

  // Handle zoom
  const handleZoomChange = useCallback(async (value: number[]) => {
    const newZoom = value[0];
    if (newZoom === undefined) return;

    setZoom(newZoom);

    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        try {
          await videoTrack.applyConstraints({
            // @ts-expect-error - zoom is not in standard MediaTrackConstraints types yet
            advanced: [{ zoom: newZoom }]
          });
        } catch (err) {
          console.error('Zoom error:', err);
        }
      }
    }
  }, []);

  // Switch camera
  const handleSwitchCamera = useCallback(async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    localStorage.setItem('preferredCamera', newMode);

    try {
      const stream = await startCamera(newMode);

      // Update the call with new stream
      if (callRef.current && peerRef.current && stream) {
        // Close old call
        callRef.current.close();

        // Make new call with new stream
        const call = peerRef.current.call(displayId!, stream);
        callRef.current = call;

        call.on('stream', () => {
          setIsConnected(true);
        });

        call.on('close', () => {
          setIsConnected(false);
        });
      }
    } catch (err) {
      console.error('Switch camera error:', err);
    }
  }, [facingMode, startCamera, displayId]);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Toggle video
  const handleToggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [isVideoEnabled]);

  // Share screen
  const handleShareScreen = useCallback(async () => {
    try {
      if (isSharingScreen) {
        // Switch back to camera
        const stream = await startCamera(facingMode);
        setIsSharingScreen(false);

        // Update the call with camera stream
        if (callRef.current && peerRef.current && stream) {
          callRef.current.close();
          const call = peerRef.current.call(displayId!, stream);
          callRef.current = call;

          call.on('stream', () => setIsConnected(true));
          call.on('close', () => setIsConnected(false));
        }
      } else {
        // Start screen sharing
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        streamRef.current = displayStream;

        if (videoRef.current) {
          videoRef.current.srcObject = displayStream;
        }

        setIsSharingScreen(true);

        // Update the call with screen stream
        if (callRef.current && peerRef.current) {
          callRef.current.close();
          const call = peerRef.current.call(displayId!, displayStream);
          callRef.current = call;

          call.on('stream', () => setIsConnected(true));
          call.on('close', () => setIsConnected(false));
        }

        // Listen for user stopping screen share
        const videoTrack = displayStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            handleShareScreen(); // Switch back to camera
          };
        }
      }
    } catch (err) {
      console.error('Screen share error:', err);
      setError({
        message: 'Failed to share screen. Please try again.',
        type: 'general'
      });
    }
  }, [isSharingScreen, facingMode, startCamera, displayId]);

  if (error && !streamRef.current) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-black">
        <div className="bg-red-950 border border-red-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-red-100 mb-2">Error</h2>
              <p className="text-red-200 text-sm">{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-white text-center">
          <Video className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Starting camera...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Video preview - full screen */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Connection status */}
      <div className="absolute top-4 left-4 z-20">
        <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
          isConnected
            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
        }`}>
          {isConnected ? 'Connected' : 'Connecting...'}
        </div>
      </div>

      {/* Error banner */}
      {error && streamRef.current && (
        <div className="absolute top-4 right-4 left-4 z-20 md:left-auto md:w-96">
          <div className="bg-red-950/90 backdrop-blur border border-red-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm flex-1">{error.message}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hamburger menu button */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="absolute top-4 right-4 z-30 p-3 rounded-full bg-black/50 backdrop-blur text-white hover:bg-black/70 transition-colors"
        aria-label="Toggle menu"
      >
        {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Controls panel */}
      <div
        className={`absolute right-0 top-0 h-full w-80 bg-black/90 backdrop-blur-lg border-l border-white/10 p-6 z-20 transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <h2 className="text-white text-xl font-semibold mb-6">Camera Controls</h2>

          <div className="space-y-6 flex-1">
            {/* Zoom control */}
            {zoomSupported && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ZoomIn className="w-5 h-5 text-white" />
                  <label className="text-white text-sm font-medium">
                    Zoom: {zoom.toFixed(1)}x
                  </label>
                </div>
                <Slider
                  value={[zoom]}
                  onValueChange={handleZoomChange}
                  min={zoomRange.min}
                  max={zoomRange.max}
                  step={0.1}
                  className="w-full"
                />
              </div>
            )}

            {/* Switch Camera */}
            <Button
              onClick={handleSwitchCamera}
              variant="outline"
              className="w-full justify-start gap-3"
              disabled={isSharingScreen}
            >
              <SwitchCamera className="w-5 h-5" />
              Switch Camera ({facingMode === 'user' ? 'Front' : 'Back'})
            </Button>

            {/* Toggle Video */}
            <Button
              onClick={handleToggleVideo}
              variant="outline"
              className="w-full justify-start gap-3"
            >
              {isVideoEnabled ? (
                <>
                  <Video className="w-5 h-5" />
                  Disable Video
                </>
              ) : (
                <>
                  <VideoOff className="w-5 h-5" />
                  Enable Video
                </>
              )}
            </Button>

            {/* Toggle Mute */}
            <Button
              onClick={handleToggleMute}
              variant="outline"
              className="w-full justify-start gap-3"
            >
              {isMuted ? (
                <>
                  <MicOff className="w-5 h-5" />
                  Unmute
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Mute
                </>
              )}
            </Button>

            {/* Share Screen */}
            <Button
              onClick={handleShareScreen}
              variant={isSharingScreen ? "default" : "outline"}
              className="w-full justify-start gap-3"
            >
              <MonitorUp className="w-5 h-5" />
              {isSharingScreen ? 'Stop Sharing' : 'Share Screen'}
            </Button>
          </div>

          {/* Close button */}
          <Button
            onClick={() => setMenuOpen(false)}
            variant="secondary"
            className="w-full mt-6"
          >
            Close Menu
          </Button>
        </div>
      </div>

      {/* Video disabled overlay */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-center">
            <VideoOff className="w-16 h-16 text-white/50 mx-auto mb-4" />
            <p className="text-white/70 text-lg">Video is disabled</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="text-white text-center">
            <Video className="w-12 h-12 mx-auto mb-4 animate-pulse" />
            <p className="text-lg">Loading...</p>
          </div>
        </div>
      }
    >
      <ClientPageContent />
    </Suspense>
  );
}
