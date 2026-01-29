/**
 * Tests for Audience Analyzer
 * Issue: #567 (ORB-063)
 */

import { describe, it, expect } from 'vitest';
import { AudienceAnalyzer } from './audience-analyzer';

describe('AudienceAnalyzer', () => {
  const analyzer = new AudienceAnalyzer();

  const mockEngagerData = {
    ageRanges: { '18-24': 0.3, '25-34': 0.5, '35-44': 0.2 },
    genders: { 'male': 0.4, 'female': 0.6 },
    locations: { 'US': 0.7, 'UK': 0.3 },
    interests: ['technology', 'sports', 'travel'],
  };

  it('should analyze audience and generate targeting suggestions', async () => {
    const result = await analyzer.analyzeAudience('FACEBOOK', mockEngagerData);

    expect(result.platform).toBe('FACEBOOK');
    expect(result.options).toBeInstanceOf(Array);
    expect(result.options.length).toBeGreaterThan(0);
    expect(result.audienceSize).toHaveProperty('min');
    expect(result.audienceSize).toHaveProperty('max');
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it('should extract age range targeting with threshold', async () => {
    const result = await analyzer.analyzeAudience('FACEBOOK', mockEngagerData);
    
    const ageTargeting = result.options.filter(opt => opt.key === 'age');
    expect(ageTargeting.length).toBeGreaterThan(0);
    
    // Should include ranges above 20% threshold
    const hasLargeAgeGroup = ageTargeting.some(opt => opt.value === '25-34');
    expect(hasLargeAgeGroup).toBe(true);
  });

  it('should extract gender targeting with threshold', async () => {
    const result = await analyzer.analyzeAudience('FACEBOOK', mockEngagerData);
    
    const genderTargeting = result.options.filter(opt => opt.key === 'gender');
    // Both genders are above 30% threshold
    expect(genderTargeting.length).toBe(2);
  });

  it('should extract location targeting with threshold', async () => {
    const result = await analyzer.analyzeAudience('FACEBOOK', mockEngagerData);
    
    const locationTargeting = result.options.filter(opt => opt.key === 'location');
    expect(locationTargeting.length).toBeGreaterThan(0);
    
    // US should be included (70% > 15% threshold)
    const hasUS = locationTargeting.some(opt => opt.value === 'US');
    expect(hasUS).toBe(true);
  });

  it('should extract interest targeting', async () => {
    const result = await analyzer.analyzeAudience('FACEBOOK', mockEngagerData);
    
    const interestTargeting = result.options.filter(opt => opt.type === 'interest');
    expect(interestTargeting.length).toBeGreaterThan(0);
    expect(interestTargeting.length).toBeLessThanOrEqual(10); // Max 10 interests
  });

  it('should estimate audience size based on targeting options', async () => {
    const result = await analyzer.analyzeAudience('FACEBOOK', mockEngagerData);
    
    expect(result.audienceSize.min).toBeGreaterThan(0);
    expect(result.audienceSize.max).toBeGreaterThan(result.audienceSize.min);
  });

  it('should handle empty engager data', async () => {
    const emptyData = {
      ageRanges: {},
      genders: {},
      locations: {},
      interests: [],
    };

    const result = await analyzer.analyzeAudience('FACEBOOK', emptyData);
    
    expect(result.options).toBeInstanceOf(Array);
    expect(result.audienceSize.min).toBeGreaterThan(0);
  });

  it('should calculate confidence score for targeting', () => {
    const options = [
      { type: 'demographic' as const, key: 'age', value: '18-24', confidenceScore: 0.8, source: 'ai' as const },
      { type: 'demographic' as const, key: 'gender', value: 'female', confidenceScore: 0.6, source: 'ai' as const },
    ];

    const score = analyzer.scoreTargetingConfidence(options);
    expect(score).toBe(0.7); // Average of 0.8 and 0.6
  });

  it('should return 0 confidence for empty options', () => {
    const score = analyzer.scoreTargetingConfidence([]);
    expect(score).toBe(0);
  });
});
