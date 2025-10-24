import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from './page'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

// Mock auth components
vi.mock('@/components/auth/auth-header', () => ({
  AuthHeader: () => <div data-testid="auth-header">Auth Header</div>,
  AuthSection: () => <div data-testid="auth-section">Auth Section</div>,
}))

describe('Home Page', () => {
  beforeEach(() => {
    // Default to unauthenticated state
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    })
  })

  describe('Authentication Integration', () => {
    it('should render AuthHeader component', () => {
      render(<Home />)
      expect(screen.getByTestId('auth-header')).toBeInTheDocument()
    })

    describe('when user is not authenticated', () => {
      beforeEach(() => {
        vi.mocked(useSession).mockReturnValue({
          data: null,
          status: 'unauthenticated',
          update: vi.fn(),
        })
      })

      it('should show default welcome message', () => {
        render(<Home />)
        expect(screen.getByText('Welcome to')).toBeInTheDocument()
        expect(screen.getByText('Spike Land')).toBeInTheDocument()
      })

      it('should show default description', () => {
        render(<Home />)
        expect(
          screen.getByText(/A platform for vibe-coded apps, where ideas transform into polished applications/i)
        ).toBeInTheDocument()
      })

      it('should display the authentication section with sign-in prompt', () => {
        render(<Home />)
        expect(screen.getByText('Sign in to Get Started')).toBeInTheDocument()
        expect(
          screen.getByText(/Join Spike Land to access personalized features/i)
        ).toBeInTheDocument()
      })

      it('should render AuthSection component for unauthenticated users', () => {
        render(<Home />)
        expect(screen.getByTestId('auth-section')).toBeInTheDocument()
      })
    })

    describe('when user is authenticated', () => {
      const mockSession: Session = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          image: 'https://example.com/avatar.jpg',
        },
        expires: '2024-12-31',
      }

      beforeEach(() => {
        vi.mocked(useSession).mockReturnValue({
          data: mockSession,
          status: 'authenticated',
          update: vi.fn(),
        })
      })

      it('should show personalized welcome message with user first name', () => {
        render(<Home />)
        expect(screen.getByText('Welcome back,')).toBeInTheDocument()
        expect(screen.getByText('John')).toBeInTheDocument()
      })

      it('should show personalized description for authenticated users', () => {
        render(<Home />)
        expect(
          screen.getByText(/Ready to continue your journey\? Explore our vibe-coded apps/i)
        ).toBeInTheDocument()
      })

      it('should not display AuthSection for authenticated users', () => {
        render(<Home />)
        expect(screen.queryByTestId('auth-section')).not.toBeInTheDocument()
      })

      it('should not display sign-in prompt for authenticated users', () => {
        render(<Home />)
        expect(screen.queryByText('Sign in to Get Started')).not.toBeInTheDocument()
      })

      it('should handle user without name', () => {
        vi.mocked(useSession).mockReturnValue({
          data: {
            ...mockSession,
            user: { ...mockSession.user, name: undefined },
          },
          status: 'authenticated',
          update: vi.fn(),
        })
        render(<Home />)
        expect(screen.getByText('Welcome back,')).toBeInTheDocument()
        expect(screen.getByText('User')).toBeInTheDocument()
      })

      it('should handle user with single name', () => {
        vi.mocked(useSession).mockReturnValue({
          data: {
            ...mockSession,
            user: { ...mockSession.user, name: 'Madonna' },
          },
          status: 'authenticated',
          update: vi.fn(),
        })
        render(<Home />)
        expect(screen.getByText('Welcome back,')).toBeInTheDocument()
        expect(screen.getByText('Madonna')).toBeInTheDocument()
      })
    })
  })

  describe('Hero Section', () => {

    it('should render Try Smart Video Wall button', () => {
      render(<Home />)
      const button = screen.getByRole('link', { name: /Try Smart Video Wall/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('href', '/apps/display')
    })

    it('should render View on GitHub button', () => {
      render(<Home />)
      const button = screen.getByRole('link', { name: /View on GitHub/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('href', 'https://github.com/zerdos/spike-land-nextjs')
      expect(button).toHaveAttribute('target', '_blank')
    })
  })

  describe('Platform Capabilities Section', () => {
    it('should render the platform capabilities heading', () => {
      render(<Home />)
      expect(screen.getByText('Platform Capabilities')).toBeInTheDocument()
    })

    it('should display all 6 platform features', () => {
      render(<Home />)
      expect(screen.getByText('Vibe-Coded Development')).toBeInTheDocument()
      expect(screen.getByText('Modern Tech Stack')).toBeInTheDocument()
      expect(screen.getByText('Instant Deployment')).toBeInTheDocument()
      expect(screen.getByText('Mobile-First Design')).toBeInTheDocument()
      expect(screen.getByText('Lightning Fast')).toBeInTheDocument()
      expect(screen.getByText('100% Test Coverage')).toBeInTheDocument()
    })

    it('should display platform feature descriptions', () => {
      render(<Home />)
      expect(
        screen.getByText(/Rapid app creation with AI-powered code generation/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Built with Next.js 15, TypeScript, Tailwind CSS 4/i)
      ).toBeInTheDocument()
    })
  })

  describe('Featured App Section', () => {
    it('should render the featured app heading', () => {
      render(<Home />)
      expect(screen.getByText('Featured App: Smart Video Wall')).toBeInTheDocument()
    })

    it('should display Smart Video Wall description', () => {
      render(<Home />)
      expect(
        screen.getByText(/Turn any display into a collaborative video wall/i)
      ).toBeInTheDocument()
    })

    it('should display Smart Video Wall benefits', () => {
      render(<Home />)
      expect(screen.getByText('No Installation Required')).toBeInTheDocument()
      expect(screen.getByText('Real-Time Streaming')).toBeInTheDocument()
      expect(screen.getByText('Privacy First')).toBeInTheDocument()
    })

    it('should display Smart Video Wall features', () => {
      render(<Home />)
      expect(screen.getByText('QR Code Connection')).toBeInTheDocument()
      expect(screen.getByText('WebRTC Streaming')).toBeInTheDocument()
      expect(screen.getByText('Multi-Camera Support')).toBeInTheDocument()
      expect(screen.getByText('Collaborative Display')).toBeInTheDocument()
    })

    it('should render Launch App button for Smart Video Wall', () => {
      render(<Home />)
      const buttons = screen.getAllByRole('link', { name: /Launch App/i })
      expect(buttons[0]).toBeInTheDocument()
      expect(buttons[0]).toHaveAttribute('href', '/apps/display')
    })
  })

  describe('Built with Claude Code Section', () => {
    it('should render the Claude Code heading', () => {
      render(<Home />)
      expect(screen.getByText('Vibe Coded with Claude Code')).toBeInTheDocument()
    })

    it('should display Claude Code description', () => {
      render(<Home />)
      expect(
        screen.getByText(/Experience the future of development where natural language meets production-ready code/i)
      ).toBeInTheDocument()
    })

    it('should display all Claude features', () => {
      render(<Home />)
      expect(screen.getByText('AI-Powered Development')).toBeInTheDocument()
      expect(screen.getByText('Best Practices Built-In')).toBeInTheDocument()
      expect(screen.getByText('Iterative Refinement')).toBeInTheDocument()
      expect(screen.getByText('Full-Stack Capabilities')).toBeInTheDocument()
    })

    it('should display the vibe coding philosophy', () => {
      render(<Home />)
      expect(screen.getByText('The Vibe Coding Philosophy')).toBeInTheDocument()
      expect(
        screen.getByText(/Stop wrestling with boilerplate and configuration/i)
      ).toBeInTheDocument()
    })

    it('should display vibe coding principles badges', () => {
      render(<Home />)
      expect(screen.getByText('Type Safety')).toBeInTheDocument()
      expect(screen.getByText('Accessibility')).toBeInTheDocument()
      expect(screen.getByText('Performance')).toBeInTheDocument()
      expect(screen.getByText('Testing')).toBeInTheDocument()
      expect(screen.getByText('CI/CD')).toBeInTheDocument()
    })
  })

  describe('Call to Action Section', () => {
    it('should render the CTA heading', () => {
      render(<Home />)
      expect(screen.getByText('Ready to Explore?')).toBeInTheDocument()
    })

    it('should display CTA description', () => {
      render(<Home />)
      expect(
        screen.getByText(/Discover the power of vibe-coded applications/i)
      ).toBeInTheDocument()
    })

    it('should render Launch Smart Video Wall button in CTA', () => {
      render(<Home />)
      const button = screen.getByRole('link', { name: /Launch Smart Video Wall/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('href', '/apps/display')
    })

    it('should render Try Claude Code button in CTA', () => {
      render(<Home />)
      const button = screen.getByRole('link', { name: /Try Claude Code/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('href', 'https://claude.ai')
      expect(button).toHaveAttribute('target', '_blank')
    })
  })

  describe('Page Structure', () => {
    it('should have proper semantic structure', () => {
      render(<Home />)
      const sections = document.querySelectorAll('section')
      expect(sections.length).toBeGreaterThan(0)
    })

    it('should render all main sections for unauthenticated users', () => {
      const { container } = render(<Home />)
      const sections = container.querySelectorAll('section')
      // Hero, Auth Section, Platform Features, Featured App, Claude Code, CTA
      expect(sections.length).toBe(6)
    })

    it('should render all main sections for authenticated users', () => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            name: 'John Doe',
            email: 'john@example.com',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: vi.fn(),
      })
      const { container } = render(<Home />)
      const sections = container.querySelectorAll('section')
      // Hero, Platform Features, Featured App, Claude Code, CTA (no Auth Section)
      expect(sections.length).toBe(5)
    })
  })

  describe('Accessibility', () => {
    it('should have descriptive link text for external links', () => {
      render(<Home />)
      const githubLink = screen.getByRole('link', { name: /View on GitHub/i })
      const claudeLink = screen.getByRole('link', { name: /Try Claude Code/i })
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')
      expect(claudeLink).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should have proper heading hierarchy', () => {
      const { container } = render(<Home />)
      const h1 = container.querySelector('h1')
      const h2s = container.querySelectorAll('h2')
      const h3s = container.querySelectorAll('h3')

      expect(h1).toBeInTheDocument()
      expect(h2s.length).toBeGreaterThan(0)
      expect(h3s.length).toBeGreaterThan(0)
    })
  })
})
