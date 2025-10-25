import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Geist, Geist_Mono } from 'next/font/google'
import RootLayout, { metadata } from './layout'

vi.mock('next/font/google', () => ({
  Geist: vi.fn(() => ({
    variable: '--font-geist-sans',
    subsets: ['latin'],
  })),
  Geist_Mono: vi.fn(() => ({
    variable: '--font-geist-mono',
    subsets: ['latin'],
  })),
}))

vi.mock('@/components/auth/session-provider', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => <div data-testid="analytics">Analytics</div>,
}))

vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => <div data-testid="speed-insights">SpeedInsights</div>,
}))

vi.mock('@/components/analytics/cookie-consent', () => ({
  CookieConsent: () => <div data-testid="cookie-consent">CookieConsent</div>,
}))

describe('RootLayout', () => {
  it('should call Geist font with correct config', () => {
    expect(Geist).toHaveBeenCalledWith({
      variable: '--font-geist-sans',
      subsets: ['latin'],
    })
  })

  it('should call Geist_Mono font with correct config', () => {
    expect(Geist_Mono).toHaveBeenCalledWith({
      variable: '--font-geist-mono',
      subsets: ['latin'],
    })
  })

  it('should be a function component', () => {
    expect(typeof RootLayout).toBe('function')
  })

  it('should accept children prop', () => {
    const layoutProps = {
      children: <div>Test</div>,
    }
    const result = RootLayout(layoutProps)
    expect(result).toBeDefined()
    expect(result.type).toBe('html')
  })

  it('should render html element with lang="en"', () => {
    const result = RootLayout({ children: <div>Test</div> })
    expect(result.props.lang).toBe('en')
  })

  it('should render body element inside html', () => {
    const result = RootLayout({ children: <div>Test</div> })
    expect(result.props.children.type).toBe('body')
  })

  it('should apply font class variables to body', () => {
    const result = RootLayout({ children: <div>Test</div> })
    const bodyClassName = result.props.children.props.className
    expect(bodyClassName).toContain('--font-geist-sans')
    expect(bodyClassName).toContain('--font-geist-mono')
    expect(bodyClassName).toContain('antialiased')
  })

  it('should wrap children in SessionProvider', () => {
    const testChild = <div>Test Child</div>
    const result = RootLayout({ children: testChild })
    const bodyChildren = result.props.children.props.children
    expect(bodyChildren).toBeDefined()
  })

  it('should render children within SessionProvider wrapper', () => {
    const testChild = <div>Test Child</div>
    const result = RootLayout({ children: testChild })
    const bodyChildren = result.props.children.props.children
    // SessionProvider is the first child, children are wrapped inside it
    expect(bodyChildren[0].props.children).toBe(testChild)
  })

  it('should render CookieConsent component', () => {
    const { getByTestId } = render(RootLayout({ children: <div>Test</div> }))
    expect(getByTestId('cookie-consent')).toBeInTheDocument()
  })

  it('should render Analytics component', () => {
    const { getByTestId } = render(RootLayout({ children: <div>Test</div> }))
    expect(getByTestId('analytics')).toBeInTheDocument()
  })

  it('should render SpeedInsights component', () => {
    const { getByTestId } = render(RootLayout({ children: <div>Test</div> }))
    expect(getByTestId('speed-insights')).toBeInTheDocument()
  })
})

describe('metadata', () => {
  it('should export correct metadata object', () => {
    expect(metadata).toBeDefined()
    expect(metadata.title).toBe('Spike Land - Vibe Coded Apps with Claude Code')
    expect(metadata.description).toContain('Smart Video Wall')
    expect(metadata.description).toContain('vibe-coded')
  })

  it('should have title property', () => {
    expect(metadata).toHaveProperty('title')
  })

  it('should have description property', () => {
    expect(metadata).toHaveProperty('description')
  })

  it('should have keywords for SEO', () => {
    expect(metadata).toHaveProperty('keywords')
    expect(metadata.keywords).toContain('Spike Land')
    expect(metadata.keywords).toContain('Claude Code')
  })

  it('should have authors metadata', () => {
    expect(metadata).toHaveProperty('authors')
  })

  it('should have openGraph metadata for social sharing', () => {
    expect(metadata).toHaveProperty('openGraph')
    expect(metadata.openGraph).toHaveProperty('title')
    expect(metadata.openGraph).toHaveProperty('description')
  })

  it('should have twitter card metadata', () => {
    expect(metadata).toHaveProperty('twitter')
    expect(metadata.twitter).toHaveProperty('card')
    expect(metadata.twitter).toHaveProperty('title')
    expect(metadata.twitter).toHaveProperty('description')
  })
})
