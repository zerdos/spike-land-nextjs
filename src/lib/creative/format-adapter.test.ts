/**
 * Tests for Format Adapter
 * Issue: #567 (ORB-063)
 */

import { describe, it, expect } from 'vitest';
import { FormatAdapter } from './format-adapter';

describe('FormatAdapter', () => {
  const adapter = new FormatAdapter();

  it('should adapt creative for multiple formats and placements', async () => {
    const result = await adapter.adaptCreative({
      postId: 'test-post',
      content: 'Test content for ad',
      mediaUrl: 'https://example.com/image.jpg',
      formats: ['IMAGE'],
      placements: ['FEED', 'STORY'],
    });

    expect(result).toHaveLength(2); // 1 format × 2 placements
    expect(result[0].format).toBe('IMAGE');
    expect(result[0].placement).toBe('FEED');
    expect(result[1].placement).toBe('STORY');
  });

  it('should generate correct aspect ratio for FEED placement', async () => {
    const result = await adapter.adaptCreative({
      postId: 'test-post',
      content: 'Test',
      mediaUrl: 'https://example.com/image.jpg',
      formats: ['IMAGE'],
      placements: ['FEED'],
    });

    expect(result[0].media.aspectRatio).toBe('1:1');
    expect(result[0].media.width).toBe(1080);
    expect(result[0].media.height).toBe(1080);
  });

  it('should generate correct aspect ratio for STORY placement', async () => {
    const result = await adapter.adaptCreative({
      postId: 'test-post',
      content: 'Test',
      mediaUrl: 'https://example.com/image.jpg',
      formats: ['IMAGE'],
      placements: ['STORY'],
    });

    expect(result[0].media.aspectRatio).toBe('9:16');
    expect(result[0].media.width).toBe(1080);
    expect(result[0].media.height).toBe(1920);
  });

  it('should optimize text length for placement', async () => {
    const longContent = 'A'.repeat(500);
    
    const result = await adapter.adaptCreative({
      postId: 'test-post',
      content: longContent,
      mediaUrl: 'https://example.com/image.jpg',
      formats: ['IMAGE'],
      placements: ['FEED'],
    });

    expect(result[0].content.headline?.length).toBeLessThanOrEqual(40);
    expect(result[0].content.primaryText?.length).toBeLessThanOrEqual(280);
  });

  it('should mark all adaptations as applied', async () => {
    const result = await adapter.adaptCreative({
      postId: 'test-post',
      content: 'Test',
      mediaUrl: 'https://example.com/image.jpg',
      formats: ['IMAGE'],
      placements: ['FEED'],
    });

    expect(result[0].adaptations.textLengthOptimized).toBe(true);
    expect(result[0].adaptations.ctaOptimized).toBe(true);
    expect(result[0].adaptations.aspectRatioAdjusted).toBe(true);
  });
});
