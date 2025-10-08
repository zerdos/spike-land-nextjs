'use client';

import { useEffect, useRef, useState } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import QRCode from 'qrcode';
import Image from 'next/image';
import { calculateOptimalLayout } from '@apps/display/lib/layout-optimizer';
import { getTwilioIceServers } from '@apps/display/lib/webrtc/config';

interface VideoStream {
  id: string;
  stream: MediaStream;
  connection: MediaConnection;
}

export default function DisplayPage() {
  const [displayId, setDisplayId] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [videoStreams, setVideoStreams] = useState<VideoStream[]>([]);
  const [displayDimensions, setDisplayDimensions] = useState({ width: 1920, height: 1080 });

  const peerRef = useRef<Peer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize PeerJS and generate QR code
  useEffect(() => {
    let peer: Peer | null = null;

    // Initialize peer with Twilio TURN servers
    const initializePeer = async () => {
      // Fetch Twilio ICE servers for reliable 4G/5G connectivity
      const iceServers = await getTwilioIceServers();

      // Create a new Peer instance with TURN servers for 4G/5G support
      peer = new Peer({
        config: {
          iceServers,
        },
      });

      peerRef.current = peer;

      // Handle peer open event - we now have an ID
      peer.on('open', (id) => {
        setDisplayId(id);

        // Generate QR code URL
        const clientUrl = `${window.location.origin}/apps/display/client?displayId=${id}`;
        QRCode.toDataURL(clientUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        })
          .then((url) => {
            setQrCodeUrl(url);
          })
          .catch(() => {
            // QR code generation failed
          });
      });

      // Handle incoming connections from clients
      peer.on('connection', (dataConnection) => {
        // Send a welcome message
        dataConnection.on('open', () => {
          dataConnection.send({ type: 'welcome', message: 'Connected to display' });
        });
      });

      // Handle incoming media calls from clients
      peer.on('call', (call) => {
        // Answer the call (we don't send our own stream)
        call.answer();

        // Receive the remote stream
        call.on('stream', (remoteStream) => {
          setVideoStreams((prev) => {
            // Check if stream already exists
            const exists = prev.some((vs) => vs.id === call.peer);
            if (exists) {
              return prev;
            }

            // Add new stream
            return [
              ...prev,
              {
                id: call.peer,
                stream: remoteStream,
                connection: call,
              },
            ];
          });
        });

        // Handle call close
        call.on('close', () => {
          setVideoStreams((prev) => prev.filter((vs) => vs.id !== call.peer));
        });

        // Handle errors
        call.on('error', () => {
          setVideoStreams((prev) => prev.filter((vs) => vs.id !== call.peer));
        });
      });

      // Handle errors
      peer.on('error', () => {
        // Error occurred
      });
    };

    // Start initialization
    initializePeer();

    // Cleanup on unmount
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  // Track display dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDisplayDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate optimal layout
  const layout = calculateOptimalLayout({
    displayWidth: displayDimensions.width,
    displayHeight: displayDimensions.height,
    numClients: videoStreams.length,
    videoAspectRatio: 16 / 9,
    minCellPadding: 8,
  });

  return (
    <div ref={containerRef} className="relative h-screen w-full bg-black overflow-hidden">
      {/* Video Grid */}
      {videoStreams.length > 0 ? (
        <div
          className="grid h-full w-full gap-2 p-2 transition-all duration-500 ease-in-out"
          style={{
            gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
            gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
          }}
        >
          {videoStreams.map((videoStream) => (
            <VideoCell
              key={videoStream.id}
              stream={videoStream.stream}
              peerId={videoStream.id}
              layout={layout}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Smart Video Wall Display</h1>
            <p className="text-xl text-gray-300 mb-8">Waiting for clients to connect...</p>
            {qrCodeUrl && (
              <div className="bg-white p-6 rounded-lg inline-block">
                <Image src={qrCodeUrl} alt="QR Code" width={200} height={200} className="mx-auto" />
                <p className="mt-4 text-sm text-gray-600">
                  Scan to connect your camera
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code in corner when clients are connected */}
      {videoStreams.length > 0 && qrCodeUrl && (
        <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg transition-opacity duration-300 hover:opacity-100 opacity-75">
          <Image src={qrCodeUrl} alt="QR Code" width={128} height={128} />
          <p className="text-xs text-center mt-2 text-gray-600">Add Client</p>
        </div>
      )}

      {/* Status indicator */}
      <div className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              displayId ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
            }`}
          />
          <span className="text-sm">
            {displayId ? `Display Ready (${videoStreams.length} clients)` : 'Initializing...'}
          </span>
        </div>
        {displayId && (
          <p className="text-xs text-gray-300 mt-1 font-mono">ID: {displayId}</p>
        )}
      </div>
    </div>
  );
}

interface VideoCellProps {
  stream: MediaStream;
  peerId: string;
  layout: {
    videoWidth: number;
    videoHeight: number;
  };
}

function VideoCell({ stream, peerId, layout }: VideoCellProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden transition-all duration-500">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="object-cover w-full h-full transition-all duration-500"
        style={{
          maxWidth: `${layout.videoWidth}px`,
          maxHeight: `${layout.videoHeight}px`,
        }}
      />

      {/* Peer ID overlay */}
      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
        {peerId.slice(0, 8)}...
      </div>
    </div>
  );
}
