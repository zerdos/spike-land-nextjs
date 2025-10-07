import { describe, it, expect } from 'vitest';
import * as AppsComponents from './index';

describe('Apps Components Exports', () => {
  it('exports AppCard component', () => {
    expect(AppsComponents.AppCard).toBeDefined();
    expect(typeof AppsComponents.AppCard).toBe('function');
  });

  it('exports AppScreenshotGallery component', () => {
    expect(AppsComponents.AppScreenshotGallery).toBeDefined();
    expect(typeof AppsComponents.AppScreenshotGallery).toBe('function');
  });

  it('exports AppFeatureList component', () => {
    expect(AppsComponents.AppFeatureList).toBeDefined();
    expect(typeof AppsComponents.AppFeatureList).toBe('function');
  });

  it('has all expected exports', () => {
    const expectedExports = [
      'AppCard',
      'AppScreenshotGallery',
      'AppFeatureList',
    ];

    expectedExports.forEach(exportName => {
      expect(AppsComponents).toHaveProperty(exportName);
    });
  });
});
