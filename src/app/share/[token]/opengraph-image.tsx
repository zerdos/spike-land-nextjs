import prisma from "@/lib/prisma";
import { ImageResponse } from "next/og";

// Use Node.js runtime since Prisma requires it
export const runtime = "nodejs";
export const alt = "Enhanced Image Preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface ImageProps {
  params: Promise<{ token: string; }>;
}

export default async function Image({ params }: ImageProps) {
  const { token } = await params;

  const image = await prisma.enhancedImage.findUnique({
    where: { shareToken: token },
    include: {
      enhancementJobs: {
        where: {
          status: "COMPLETED",
          enhancedUrl: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const imageUrl = image?.enhancementJobs[0]?.enhancedUrl ?? image?.originalUrl;
  const imageName = image?.name ?? "Enhanced Image";

  // If no image found, return a fallback
  if (!imageUrl) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
            color: "white",
            fontSize: 48,
            fontWeight: "bold",
          }}
        >
          Image Not Found
        </div>
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          position: "relative",
        }}
      >
        {/* Background image */}
        <img
          src={imageUrl}
          alt={imageName}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Gradient overlay at bottom */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "120px",
            background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
            alignItems: "flex-end",
            padding: "20px 30px",
          }}
        >
          {/* Branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #22d3ee, #06b6d4)",
              }}
            >
              <span style={{ fontSize: "24px" }}>✨</span>
            </div>
            <span
              style={{
                color: "white",
                fontSize: "28px",
                fontWeight: "bold",
              }}
            >
              pixel
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "20px",
                marginLeft: "8px",
              }}
            >
              AI Enhanced
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
