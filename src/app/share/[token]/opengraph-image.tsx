import prisma from "@/lib/prisma";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Enhanced Image Preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600; // Cache for 1 hour

interface ImageProps {
  params: Promise<{ token: string; }>;
}

/**
 * Validates that an image URL is from our allowed R2 domain
 * to prevent SSRF attacks from loading arbitrary external URLs
 */
export function isAllowedImageUrl(url: string): boolean {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (!publicUrl) return false;
  return url.startsWith(publicUrl);
}

/**
 * Creates a fallback OG image when the actual image is unavailable
 */
function createFallbackImage(): ImageResponse {
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

export default async function Image({ params }: ImageProps): Promise<ImageResponse> {
  try {
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

    const originalUrl = image?.originalUrl;
    const enhancedUrl = image?.enhancementJobs[0]?.enhancedUrl;

    // Validate URLs to prevent SSRF attacks
    const hasValidOriginal = originalUrl && isAllowedImageUrl(originalUrl);
    const hasValidEnhanced = enhancedUrl && isAllowedImageUrl(enhancedUrl);

    // Need at least one valid image
    if (!hasValidOriginal && !hasValidEnhanced) {
      return createFallbackImage();
    }

    // If we have both images, show split comparison
    if (hasValidOriginal && hasValidEnhanced) {
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
            {/* Split comparison container */}
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "100%",
                position: "relative",
              }}
            >
              {/* Left half - Original */}
              <div
                style={{
                  display: "flex",
                  width: "50%",
                  height: "100%",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <img
                  src={originalUrl}
                  alt="Original"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "200%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                {/* Before label */}
                <div
                  style={{
                    display: "flex",
                    position: "absolute",
                    top: "20px",
                    left: "20px",
                    background: "rgba(0,0,0,0.6)",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "18px",
                    fontWeight: "600",
                  }}
                >
                  Before
                </div>
              </div>

              {/* Divider line */}
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  bottom: 0,
                  width: "4px",
                  background: "white",
                  transform: "translateX(-50%)",
                  boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                }}
              />

              {/* Right half - Enhanced */}
              <div
                style={{
                  display: "flex",
                  width: "50%",
                  height: "100%",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <img
                  src={enhancedUrl}
                  alt="Enhanced"
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "200%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                {/* After label */}
                <div
                  style={{
                    display: "flex",
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    background: "rgba(34,211,238,0.8)",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "18px",
                    fontWeight: "600",
                  }}
                >
                  After
                </div>
              </div>
            </div>

            {/* Gradient overlay at bottom */}
            <div
              style={{
                display: "flex",
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "100px",
                background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                alignItems: "flex-end",
                padding: "16px 24px",
              }}
            >
              {/* Branding */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #22d3ee, #06b6d4)",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>✨</span>
                </div>
                <span
                  style={{
                    color: "white",
                    fontSize: "24px",
                    fontWeight: "bold",
                  }}
                >
                  pixel
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "16px",
                    marginLeft: "6px",
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

    // Fallback: show single image (enhanced if available, otherwise original)
    const singleImageUrl = hasValidEnhanced ? enhancedUrl : originalUrl;

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
          <img
            src={singleImageUrl}
            alt="Enhanced Image"
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
              height: "100px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
              alignItems: "flex-end",
              padding: "16px 24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #22d3ee, #06b6d4)",
                }}
              >
                <span style={{ fontSize: "20px" }}>✨</span>
              </div>
              <span
                style={{
                  color: "white",
                  fontSize: "24px",
                  fontWeight: "bold",
                }}
              >
                pixel
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "16px",
                  marginLeft: "6px",
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
  } catch (error) {
    console.error("Error generating OG image:", error);
    return createFallbackImage();
  }
}
