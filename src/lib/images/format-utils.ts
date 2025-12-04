/**
 * Client-safe image format utilities
 * These functions can be used in both client and server components
 */

/**
 * Supported image export formats
 */
export type ExportFormat = 'png' | 'jpeg' | 'webp'

/**
 * Estimates the file size for a given format
 * Based on empirical compression ratios
 */
export function estimateFileSize(
  originalSizeBytes: number,
  format: ExportFormat,
  quality?: number
): number {
  switch (format) {
    case 'png':
      // PNG is lossless, typically 1.2-1.5x larger than original JPEG
      return Math.round(originalSizeBytes * 1.3)
    case 'jpeg':
      // JPEG size depends on quality
      const qualityFactor = (quality || 95) / 100
      return Math.round(originalSizeBytes * qualityFactor * 0.9)
    case 'webp':
      // WebP is typically 25-35% smaller than JPEG at similar quality
      return Math.round(originalSizeBytes * 0.7)
    default:
      return originalSizeBytes
  }
}

/**
 * Validates if a format is supported
 */
export function isValidFormat(format: string): format is ExportFormat {
  return ['png', 'jpeg', 'webp'].includes(format)
}

/**
 * Gets the file extension for a format
 */
export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'jpeg':
      return 'jpg'
    default:
      return format
  }
}
