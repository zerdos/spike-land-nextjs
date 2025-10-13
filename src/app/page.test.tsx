import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from './page'
import { useSession } from 'next-auth/react'

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}))

vi.mock('@/components/auth/auth-header', () => ({
  AuthHeader: () => <div>AuthHeader Mock</div>,
  AuthSection: () => <div>AuthSection Mock</div>,
}))

describe('Home Page', () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({ data: null, status: 'unauthenticated', update: vi.fn() })
  })

  it('should render the page', () => {
    render(<Home />)
    expect(screen.getByText('Welcome to Your App')).toBeInTheDocument()
  })

  it('should display the correct description', () => {
    render(<Home />)
    expect(
      screen.getByText('Built with Next.js 15, TypeScript, Tailwind CSS 4, and shadcn/ui')
    ).toBeInTheDocument()
  })

  it('should render AuthHeader component', () => {
    render(<Home />)
    expect(screen.getByText('AuthHeader Mock')).toBeInTheDocument()
  })

  it('should show sign in prompt when not authenticated', () => {
    render(<Home />)
    expect(screen.getByText('Sign in to get started')).toBeInTheDocument()
    expect(screen.getByText('Choose your preferred sign-in method to access all features.')).toBeInTheDocument()
  })

  it('should render AuthSection when not authenticated', () => {
    render(<Home />)
    expect(screen.getByText('AuthSection Mock')).toBeInTheDocument()
  })

  it('should show tech stack when authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'Test User', email: 'test@example.com' } },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Home />)
    expect(screen.getByText('Tech Stack:')).toBeInTheDocument()
    expect(screen.getByText('✓ Next.js 15 with App Router')).toBeInTheDocument()
    expect(screen.getByText('✓ Strict TypeScript configuration')).toBeInTheDocument()
    expect(screen.getByText('✓ Tailwind CSS 4 (latest)')).toBeInTheDocument()
    expect(screen.getByText('✓ shadcn/ui components')).toBeInTheDocument()
    expect(screen.getByText('✓ NextAuth.js authentication')).toBeInTheDocument()
    expect(screen.getByText('✓ ESLint configured')).toBeInTheDocument()
  })

  it('should personalize welcome message when authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'John Doe', email: 'john@example.com' } },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Home />)
    expect(screen.getByText('Welcome back, John Doe!')).toBeInTheDocument()
  })

  it('should show default User when name is not available', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { email: 'test@example.com' } },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Home />)
    expect(screen.getByText('Welcome back, User!')).toBeInTheDocument()
  })

  it('should render Get Started button when authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'Test User', email: 'test@example.com' } },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Home />)
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument()
  })

  it('should render Learn More button when authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'Test User', email: 'test@example.com' } },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Home />)
    expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument()
  })

  it('should render buttons with correct variants when authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'Test User', email: 'test@example.com' } },
      status: 'authenticated',
      update: vi.fn(),
    })

    render(<Home />)
    const getStartedButton = screen.getByRole('button', { name: 'Get Started' })
    const learnMoreButton = screen.getByRole('button', { name: 'Learn More' })

    expect(getStartedButton).toHaveClass('bg-primary')
    expect(learnMoreButton).toHaveClass('border')
  })

  it('should have proper page layout structure', () => {
    render(<Home />)
    const container = screen.getByText('Welcome to Your App').closest('div')
    expect(container?.parentElement?.parentElement?.parentElement).toHaveClass('flex', 'min-h-screen', 'items-center', 'justify-center')
  })
})
