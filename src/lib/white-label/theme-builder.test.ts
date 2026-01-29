import { describe, it, expect } from 'vitest';
import { 
    buildThemeCss, 
    buildRuntimeThemeConfig, 
    getThemeCacheKey, 
    isValidHexColor, 
    hexToRgb, 
    buildThemeCssWithAlpha, 
    buildTailwindColors 
} from './theme-builder';
import type { WorkspaceWhiteLabelConfig } from '@/types/white-label';

describe('Theme Builder', () => {
    const mockConfig: WorkspaceWhiteLabelConfig = {
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
        accentColor: '#0000ff',
        fontFamily: 'Roboto',
        logoUrl: 'https://example.com/logo.png',
        faviconUrl: 'https://example.com/favicon.ico',
        workspaceId: '123',
        id: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailSenderName: null,
        emailSenderDomain: null,
        emailSenderVerified: false,
        emailHeaderLogoUrl: null,
        emailFooterText: null,
        showPoweredBySpikeLand: true,
        customDomain: null,
        dnsVerificationToken: null,
        dnsVerificationStatus: 'PENDING',
        customDomainVerified: false,
        sslCertificateStatus: 'PENDING',
        sslCertificateIssuedAt: null,
        sslCertificateExpiresAt: null,
        logoR2Key: null,
        faviconR2Key: null,
        loginPageTitle: null,
        loginPageDescription: null,
        loginBackgroundUrl: null,
        loginBackgroundR2Key: null,
        pdfHeaderLogoUrl: null,
        pdfFooterText: null,
        pdfWatermarkUrl: null,
    };

    describe('buildThemeCss', () => {
        it('should use default colors if config is null', () => {
            const css = buildThemeCss(null);
            expect(css).toContain('--wl-primary: #3b82f6');
        });

        it('should use custom colors from config', () => {
            const css = buildThemeCss(mockConfig);
            expect(css).toContain('--wl-primary: #ff0000');
            expect(css).toContain('--wl-font-family: Roboto');
        });
    });

    describe('buildRuntimeThemeConfig', () => {
        it('should return default config if null', () => {
            const runtime = buildRuntimeThemeConfig(null);
            expect(runtime.colors.primary).toBe('#3b82f6');
        });

        it('should return custom config', () => {
            const runtime = buildRuntimeThemeConfig(mockConfig);
            expect(runtime.colors.primary).toBe('#ff0000');
            expect(runtime.logos.main).toBe('https://example.com/logo.png');
        });
    });

    describe('getThemeCacheKey', () => {
        it('should return correct format', () => {
            expect(getThemeCacheKey('123')).toBe('theme:123');
        });
    });

    describe('isValidHexColor', () => {
        it('should return true for valid hex', () => {
            expect(isValidHexColor('#fff')).toBe(true);
            expect(isValidHexColor('#ffffff')).toBe(true);
            expect(isValidHexColor('#ABCDEF')).toBe(true);
        });

        it('should return false for invalid hex', () => {
            expect(isValidHexColor('red')).toBe(false);
            expect(isValidHexColor('#12')).toBe(false);
            expect(isValidHexColor('#gggggg')).toBe(false);
        });
    });

    describe('hexToRgb', () => {
        it('should convert hex to rgb options', () => {
            expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
            expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
            expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
        });
        
        it('should return null for invalid hex', () => {
            expect(hexToRgb('invalid')).toBeNull();
        });
    });

    describe('buildThemeCssWithAlpha', () => {
        it('should include rgb variables', () => {
            const css = buildThemeCssWithAlpha(mockConfig);
            expect(css).toContain('--wl-primary-rgb: 255, 0, 0');
        });
    });

    describe('buildTailwindColors', () => {
        it('should return tailwind config object', () => {
            const colors = buildTailwindColors(mockConfig);
            expect(colors['wl-primary']).toBe('#ff0000');
        });
    });
});
