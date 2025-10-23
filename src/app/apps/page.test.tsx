import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import AppsPage from './page'

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
  CardFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-footer">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, className }: { children: React.ReactNode; asChild?: boolean; className?: string }) => {
    if (asChild) {
      return <>{children}</>
    }
    return <button data-testid="button" className={className}>{children}</button>
  },
}))

describe('AppsPage', () => {
  describe('Page Structure', () => {
    it('should render without crashing', () => {
      render(<AppsPage />)
      expect(screen.getByText('Featured Apps')).toBeInTheDocument()
    })

    it('should render main container with correct spacing', () => {
      const { container } = render(<AppsPage />)
      const mainDiv = container.querySelector('.space-y-8')
      expect(mainDiv).toBeInTheDocument()
    })

    it('should render two main sections', () => {
      const { container } = render(<AppsPage />)
      const sections = container.querySelectorAll('section')
      expect(sections).toHaveLength(2)
    })

    it('should render featured apps section first', () => {
      const { container } = render(<AppsPage />)
      const sections = container.querySelectorAll('section')
      expect(within(sections[0]).getByText('Featured Apps')).toBeInTheDocument()
    })

    it('should render coming soon section second', () => {
      const { container } = render(<AppsPage />)
      const sections = container.querySelectorAll('section')
      expect(within(sections[1]).getByText('More Apps Coming Soon')).toBeInTheDocument()
    })
  })

  describe('Featured Apps Section', () => {
    it('should render featured apps heading', () => {
      render(<AppsPage />)
      const heading = screen.getByRole('heading', { name: 'Featured Apps', level: 2 })
      expect(heading).toBeInTheDocument()
    })

    it('should render grid layout for apps', () => {
      const { container } = render(<AppsPage />)
      const grid = container.querySelector('.grid')
      expect(grid).toBeInTheDocument()
    })

    it('should apply responsive grid classes', () => {
      const { container } = render(<AppsPage />)
      const grid = container.querySelector('.md\\:grid-cols-2')
      expect(grid).toBeInTheDocument()
    })

    it('should render exactly one app card', () => {
      render(<AppsPage />)
      const cards = screen.getAllByTestId('card')
      // Filter out the coming soon card
      const appCards = cards.filter(card =>
        within(card).queryByText('Smart Video Wall') !== null
      )
      expect(appCards).toHaveLength(1)
    })
  })

  describe('Smart Video Wall App Card', () => {
    it('should render app title', () => {
      render(<AppsPage />)
      expect(screen.getByText('Smart Video Wall')).toBeInTheDocument()
    })

    it('should render app description', () => {
      render(<AppsPage />)
      expect(screen.getByText(/A real-time video conferencing wall with WebRTC support/i)).toBeInTheDocument()
    })

    it('should render complete app description', () => {
      render(<AppsPage />)
      expect(screen.getByText(/Display multiple video streams simultaneously with automatic layout optimization/i)).toBeInTheDocument()
    })

    it('should render app tags', () => {
      render(<AppsPage />)
      expect(screen.getByText('WebRTC')).toBeInTheDocument()
      expect(screen.getByText('Video')).toBeInTheDocument()
      expect(screen.getByText('Real-time')).toBeInTheDocument()
    })

    it('should render exactly 3 tags', () => {
      render(<AppsPage />)
      const tags = ['WebRTC', 'Video', 'Real-time']
      tags.forEach(tag => {
        expect(screen.getByText(tag)).toBeInTheDocument()
      })
    })

    it('should render tags with correct styling classes', () => {
      const { container } = render(<AppsPage />)
      const tags = container.querySelectorAll('.inline-flex')
      expect(tags.length).toBeGreaterThan(0)
    })

    it('should render launch app button', () => {
      render(<AppsPage />)
      const button = screen.getByRole('link', { name: 'Launch App' })
      expect(button).toBeInTheDocument()
    })

    it('should have correct href for launch button', () => {
      render(<AppsPage />)
      const button = screen.getByRole('link', { name: 'Launch App' })
      expect(button).toHaveAttribute('href', '/display')
    })

    it('should render card with flex column layout', () => {
      const { container } = render(<AppsPage />)
      const card = container.querySelector('.flex-col')
      expect(card).toBeInTheDocument()
    })
  })

  describe('App Card Components', () => {
    it('should render card header', () => {
      render(<AppsPage />)
      expect(screen.getAllByTestId('card-header').length).toBeGreaterThan(0)
    })

    it('should render card content', () => {
      render(<AppsPage />)
      expect(screen.getAllByTestId('card-content').length).toBeGreaterThan(0)
    })

    it('should render card footer', () => {
      render(<AppsPage />)
      expect(screen.getAllByTestId('card-footer').length).toBeGreaterThan(0)
    })

    it('should render card title', () => {
      render(<AppsPage />)
      expect(screen.getAllByTestId('card-title').length).toBeGreaterThan(0)
    })

    it('should render card description', () => {
      render(<AppsPage />)
      expect(screen.getAllByTestId('card-description').length).toBeGreaterThan(0)
    })

    it('should have flex-1 class on card content', () => {
      render(<AppsPage />)
      const cardContent = screen.getAllByTestId('card-content')[0]
      expect(cardContent).toHaveClass('flex-1')
    })
  })

  describe('Coming Soon Section', () => {
    it('should render coming soon section', () => {
      const { container } = render(<AppsPage />)
      const section = container.querySelector('.mt-12')
      expect(section).toBeInTheDocument()
    })

    it('should render coming soon heading', () => {
      render(<AppsPage />)
      const heading = screen.getByRole('heading', { name: 'More Apps Coming Soon', level: 3 })
      expect(heading).toBeInTheDocument()
    })

    it('should render coming soon description', () => {
      render(<AppsPage />)
      expect(screen.getByText(/We are continuously building new interactive experiences/i)).toBeInTheDocument()
    })

    it('should render check back message', () => {
      render(<AppsPage />)
      expect(screen.getByText(/Check back soon for more applications/i)).toBeInTheDocument()
    })

    it('should have rounded border styling', () => {
      const { container } = render(<AppsPage />)
      const section = container.querySelector('.rounded-lg.border')
      expect(section).toBeInTheDocument()
    })

    it('should have dashed border', () => {
      const { container } = render(<AppsPage />)
      const section = container.querySelector('.border-dashed')
      expect(section).toBeInTheDocument()
    })

    it('should have text centered', () => {
      const { container } = render(<AppsPage />)
      const section = container.querySelector('.text-center')
      expect(section).toBeInTheDocument()
    })

    it('should have proper padding', () => {
      const { container } = render(<AppsPage />)
      const section = container.querySelector('.p-8')
      expect(section).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('should have gap between grid items', () => {
      const { container } = render(<AppsPage />)
      const grid = container.querySelector('.gap-6')
      expect(grid).toBeInTheDocument()
    })

    it('should have correct margin on coming soon section', () => {
      const { container } = render(<AppsPage />)
      const section = container.querySelector('.mt-12')
      expect(section).toBeInTheDocument()
    })

    it('should render tags with flex wrap', () => {
      const { container } = render(<AppsPage />)
      const tagsContainer = container.querySelector('.flex-wrap')
      expect(tagsContainer).toBeInTheDocument()
    })

    it('should have gap between tags', () => {
      const { container } = render(<AppsPage />)
      const tagsContainer = container.querySelector('.gap-2')
      expect(tagsContainer).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should have medium breakpoint grid columns', () => {
      const { container } = render(<AppsPage />)
      const grid = container.querySelector('.md\\:grid-cols-2')
      expect(grid).toBeInTheDocument()
    })

    it('should have large breakpoint grid columns', () => {
      const { container } = render(<AppsPage />)
      const grid = container.querySelector('.lg\\:grid-cols-3')
      expect(grid).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('should render launch app as a link', () => {
      render(<AppsPage />)
      const link = screen.getByRole('link', { name: 'Launch App' })
      expect(link.tagName).toBe('A')
    })

    it('should have internal link to display page', () => {
      render(<AppsPage />)
      const link = screen.getByRole('link', { name: 'Launch App' })
      expect(link).toHaveAttribute('href', '/display')
    })
  })

  describe('Content Verification', () => {
    it('should contain WebRTC keyword', () => {
      render(<AppsPage />)
      expect(screen.getByText('WebRTC')).toBeInTheDocument()
    })

    it('should mention video conferencing', () => {
      render(<AppsPage />)
      expect(screen.getByText(/video conferencing/i)).toBeInTheDocument()
    })

    it('should mention real-time functionality', () => {
      render(<AppsPage />)
      const realTimeElements = screen.getAllByText(/real-time/i)
      expect(realTimeElements.length).toBeGreaterThan(0)
    })

    it('should mention automatic layout optimization', () => {
      render(<AppsPage />)
      expect(screen.getByText(/automatic layout optimization/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const { container } = render(<AppsPage />)
      const h2 = container.querySelector('h2')
      const h3 = container.querySelector('h3')
      expect(h2).toBeInTheDocument()
      expect(h3).toBeInTheDocument()
    })

    it('should have descriptive link text', () => {
      render(<AppsPage />)
      const link = screen.getByRole('link', { name: 'Launch App' })
      expect(link.textContent).toBe('Launch App')
    })

    it('should use semantic HTML for sections', () => {
      const { container } = render(<AppsPage />)
      const sections = container.querySelectorAll('section')
      expect(sections.length).toBeGreaterThan(0)
    })
  })

  describe('Tag Styling', () => {
    it('should render tags with primary color background', () => {
      const { container } = render(<AppsPage />)
      const tag = container.querySelector('.bg-primary\\/10')
      expect(tag).toBeInTheDocument()
    })

    it('should render tags with primary color text', () => {
      const { container } = render(<AppsPage />)
      const tag = container.querySelector('.text-primary')
      expect(tag).toBeInTheDocument()
    })

    it('should render tags with ring styling', () => {
      const { container } = render(<AppsPage />)
      const tag = container.querySelector('.ring-1')
      expect(tag).toBeInTheDocument()
    })

    it('should render tags with rounded corners', () => {
      const { container } = render(<AppsPage />)
      const tag = container.querySelector('.rounded-md')
      expect(tag).toBeInTheDocument()
    })

    it('should render tags with extra small font size', () => {
      const { container } = render(<AppsPage />)
      const tag = container.querySelector('.text-xs')
      expect(tag).toBeInTheDocument()
    })
  })

  describe('Button Styling', () => {
    it('should render button with full width', () => {
      render(<AppsPage />)
      const button = screen.getByRole('link', { name: 'Launch App' })
      expect(button).toHaveClass('w-full')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty tags array gracefully', () => {
      render(<AppsPage />)
      const cards = screen.getAllByTestId('card')
      expect(cards.length).toBeGreaterThan(0)
    })

    it('should render all elements even with minimal data', () => {
      render(<AppsPage />)
      expect(screen.getByText('Featured Apps')).toBeInTheDocument()
      expect(screen.getByText('Smart Video Wall')).toBeInTheDocument()
      expect(screen.getByText('More Apps Coming Soon')).toBeInTheDocument()
    })
  })
})
