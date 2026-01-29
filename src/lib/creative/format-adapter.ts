/**
 * Creative Format Adapter
 * Adapts content for different ad formats and placements
 * Issue: #567 (ORB-063)
 */

import type { CreativeVariant, AdPlacement, CreativeFormat } from '@/lib/types/organic-to-ad';

export class FormatAdapter {
  /**
   * Adapt creative for different formats and placements
   */
  async adaptCreative(params: {
    postId: string;
    content: string;
    mediaUrl: string;
    formats: CreativeFormat[];
    placements: AdPlacement[];
  }): Promise<CreativeVariant[]> {
    const variants: CreativeVariant[] = [];

    for (const format of params.formats) {
      for (const placement of params.placements) {
        const variant = await this.createVariant({
          postId: params.postId,
          content: params.content,
          mediaUrl: params.mediaUrl,
          format,
          placement,
        });
        variants.push(variant);
      }
    }

    return variants;
  }

  private async createVariant(params: {
    postId: string;
    content: string;
    mediaUrl: string;
    format: CreativeFormat;
    placement: AdPlacement;
  }): Promise<CreativeVariant> {
    const { aspectRatio, width, height } = this.getPlacementDimensions(params.placement);
    const optimizedText = this.optimizeText(params.content, params.placement);

    return {
      id: `${params.postId}-${params.format}-${params.placement}`,
      format: params.format,
      placement: params.placement,
      content: {
        headline: optimizedText.headline,
        primaryText: optimizedText.primaryText,
        description: optimizedText.description,
        callToAction: 'Learn More',
      },
      media: {
        url: params.mediaUrl,
        type: 'image',
        width,
        height,
        aspectRatio,
      },
      adaptations: {
        textLengthOptimized: true,
        ctaOptimized: true,
        aspectRatioAdjusted: true,
      },
    };
  }

  private getPlacementDimensions(placement: AdPlacement): {
    aspectRatio: string;
    width: number;
    height: number;
  } {
    switch (placement) {
      case 'FEED':
        return { aspectRatio: '1:1', width: 1080, height: 1080 };
      case 'STORY':
        return { aspectRatio: '9:16', width: 1080, height: 1920 };
      case 'REELS':
        return { aspectRatio: '9:16', width: 1080, height: 1920 };
      case 'EXPLORE':
        return { aspectRatio: '1:1', width: 1080, height: 1080 };
      default:
        return { aspectRatio: '1:1', width: 1080, height: 1080 };
    }
  }

  private optimizeText(content: string, placement: AdPlacement): {
    headline?: string;
    primaryText?: string;
    description?: string;
  } {
    const maxLengths = this.getPlacementTextLimits(placement);
    
    return {
      headline: content.slice(0, maxLengths.headline),
      primaryText: content.slice(0, maxLengths.primaryText),
      description: content.slice(0, maxLengths.description),
    };
  }

  private getPlacementTextLimits(placement: AdPlacement): {
    headline: number;
    primaryText: number;
    description: number;
  } {
    // Platform-specific text limits
    return {
      headline: 40,
      primaryText: placement === 'STORY' ? 125 : 280,
      description: 90,
    };
  }
}
