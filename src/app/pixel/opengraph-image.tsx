import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Pixel - AI Image Enhancement | Spike Land";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
          padding: "40px",
        }}
      >
        {/* Logo and Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          {/* Pixel Grid Logo */}
          <div
            style={{
              display: "flex",
              width: "80px",
              height: "80px",
              position: "relative",
            }}
          >
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <radialGradient
                  id="sparkGradient"
                  cx="50%"
                  cy="50%"
                  r="50%"
                >
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="30%" stopColor="#00E5FF" />
                  <stop offset="70%" stopColor="#FF00FF" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#FF00FF" stopOpacity="0.7" />
                </radialGradient>
              </defs>
              {/* 3x3 Grid */}
              <rect x="2" y="2" width="22" height="22" rx="4" fill="#374151" />
              <rect x="29" y="2" width="22" height="22" rx="4" fill="#374151" />
              <rect x="56" y="2" width="22" height="22" rx="4" fill="#374151" />
              <rect x="2" y="29" width="22" height="22" rx="4" fill="#374151" />
              <rect
                x="29"
                y="29"
                width="22"
                height="22"
                rx="4"
                fill="url(#sparkGradient)"
              />
              <rect
                x="56"
                y="29"
                width="22"
                height="22"
                rx="4"
                fill="#374151"
              />
              <rect x="2" y="56" width="22" height="22" rx="4" fill="#374151" />
              <rect
                x="29"
                y="56"
                width="22"
                height="22"
                rx="4"
                fill="#374151"
              />
              <rect
                x="56"
                y="56"
                width="22"
                height="22"
                rx="4"
                fill="#374151"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: "72px",
              fontWeight: "bold",
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            pixel
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: "36px",
            color: "rgba(255, 255, 255, 0.8)",
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: "1.4",
          }}
        >
          AI Image Enhancement
        </div>
      </div>
    ),
    { ...size },
  );
}
