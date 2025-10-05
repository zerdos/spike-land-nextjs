import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from './page'

describe('Home Page', () => {
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

  it('should display the tech stack section', () => {
    render(<Home />)
    expect(screen.getByText('Tech Stack:')).toBeInTheDocument()
  })

  it('should list all tech stack items', () => {
    render(<Home />)
    expect(screen.getByText('✓ Next.js 15 with App Router')).toBeInTheDocument()
    expect(screen.getByText('✓ Strict TypeScript configuration')).toBeInTheDocument()
    expect(screen.getByText('✓ Tailwind CSS 4 (latest)')).toBeInTheDocument()
    expect(screen.getByText('✓ shadcn/ui components')).toBeInTheDocument()
    expect(screen.getByText('✓ ESLint configured')).toBeInTheDocument()
  })

  it('should render Get Started button', () => {
    render(<Home />)
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument()
  })

  it('should render Learn More button', () => {
    render(<Home />)
    expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument()
  })

  it('should render buttons with correct variants', () => {
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
