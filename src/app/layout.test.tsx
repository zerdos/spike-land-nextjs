import { describe, it, expect, vi } from 'vitest'
import { Geist, Geist_Mono } from 'next/font/google'
import RootLayout, { metadata } from './layout'

// Mock next/font/google
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

  it('should pass children to body element', () => {
    const testChild = <div>Test Child</div>
    const result = RootLayout({ children: testChild })
    expect(result.props.children.props.children).toBe(testChild)
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
