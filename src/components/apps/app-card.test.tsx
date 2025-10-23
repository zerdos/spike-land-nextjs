import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppCard, AppCardProps } from './app-card'

describe('AppCard', () => {
  const defaultProps: AppCardProps = {
    name: 'Test App',
    description: 'This is a test application description',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders with minimal required props', () => {
      render(<AppCard {...defaultProps} />)

      expect(screen.getByText('Test App')).toBeInTheDocument()
      expect(screen.getByText('This is a test application description')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /launch app/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument()
    })

    it('renders with all props provided', () => {
      const icon = <span data-testid="test-icon">Icon</span>
      const onLaunch = vi.fn()
      const onViewDetails = vi.fn()

      render(
        <AppCard
          {...defaultProps}
          icon={icon}
          appUrl="https://example.com/app"
          detailsUrl="/details"
          onLaunch={onLaunch}
          onViewDetails={onViewDetails}
          className="custom-class"
        />
      )

      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
      expect(screen.getByText('Test App')).toBeInTheDocument()
      expect(screen.getByText('This is a test application description')).toBeInTheDocument()
    })

    it('renders without icon when not provided', () => {
      render(<AppCard {...defaultProps} />)

      const iconContainer = screen.queryByTestId('test-icon')
      expect(iconContainer).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(<AppCard {...defaultProps} className="custom-test-class" />)

      const card = container.querySelector('.custom-test-class')
      expect(card).toBeInTheDocument()
    })

    it('renders card with correct structure', () => {
      render(<AppCard {...defaultProps} />)

      const title = screen.getByText('Test App')
      const description = screen.getByText('This is a test application description')

      expect(title).toBeInTheDocument()
      expect(description).toBeInTheDocument()
    })
  })

  describe('Icon Display', () => {
    it('renders icon in correct container', () => {
      const icon = <svg data-testid="svg-icon" />
      const { container } = render(<AppCard {...defaultProps} icon={icon} />)

      expect(screen.getByTestId('svg-icon')).toBeInTheDocument()
      const iconContainer = screen.getByTestId('svg-icon').parentElement
      expect(iconContainer).toHaveClass('w-12', 'h-12', 'mb-3', 'flex', 'items-center', 'justify-center')
    })

    it('renders custom icon component', () => {
      const CustomIcon = () => <div data-testid="custom-icon">Custom</div>
      render(<AppCard {...defaultProps} icon={<CustomIcon />} />)

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
      expect(screen.getByText('Custom')).toBeInTheDocument()
    })
  })

  describe('Launch Functionality', () => {
    it('calls onLaunch callback when provided', async () => {
      const user = userEvent.setup()
      const onLaunch = vi.fn()

      render(<AppCard {...defaultProps} onLaunch={onLaunch} />)

      await user.click(screen.getByRole('button', { name: /launch app/i }))

      expect(onLaunch).toHaveBeenCalledTimes(1)
    })

    it('opens appUrl in new window when onLaunch not provided', async () => {
      const user = userEvent.setup()
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      render(<AppCard {...defaultProps} appUrl="https://example.com/app" />)

      await user.click(screen.getByRole('button', { name: /launch app/i }))

      expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com/app', '_blank', 'noopener,noreferrer')

      windowOpenSpy.mockRestore()
    })

    it('prioritizes onLaunch over appUrl', async () => {
      const user = userEvent.setup()
      const onLaunch = vi.fn()
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      render(<AppCard {...defaultProps} onLaunch={onLaunch} appUrl="https://example.com/app" />)

      await user.click(screen.getByRole('button', { name: /launch app/i }))

      expect(onLaunch).toHaveBeenCalledTimes(1)
      expect(windowOpenSpy).not.toHaveBeenCalled()

      windowOpenSpy.mockRestore()
    })

    it('does nothing when neither onLaunch nor appUrl provided', async () => {
      const user = userEvent.setup()
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      render(<AppCard {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /launch app/i }))

      expect(windowOpenSpy).not.toHaveBeenCalled()

      windowOpenSpy.mockRestore()
    })
  })

  describe('View Details Functionality', () => {
    it('calls onViewDetails callback when provided', async () => {
      const user = userEvent.setup()
      const onViewDetails = vi.fn()

      render(<AppCard {...defaultProps} onViewDetails={onViewDetails} />)

      await user.click(screen.getByRole('button', { name: /view details/i }))

      expect(onViewDetails).toHaveBeenCalledTimes(1)
    })

    it('navigates to detailsUrl when onViewDetails not provided', async () => {
      const user = userEvent.setup()
      delete (window as { location?: unknown }).location
      window.location = { href: '' } as Location

      render(<AppCard {...defaultProps} detailsUrl="/app/details" />)

      await user.click(screen.getByRole('button', { name: /view details/i }))

      expect(window.location.href).toBe('/app/details')
    })

    it('prioritizes onViewDetails over detailsUrl', async () => {
      const user = userEvent.setup()
      const onViewDetails = vi.fn()
      const originalLocation = window.location
      delete (window as { location?: unknown }).location
      window.location = { href: '' } as Location

      render(<AppCard {...defaultProps} onViewDetails={onViewDetails} detailsUrl="/app/details" />)

      await user.click(screen.getByRole('button', { name: /view details/i }))

      expect(onViewDetails).toHaveBeenCalledTimes(1)
      expect(window.location.href).toBe('')

      window.location = originalLocation
    })

    it('does nothing when neither onViewDetails nor detailsUrl provided', async () => {
      const user = userEvent.setup()
      const originalLocation = window.location
      delete (window as { location?: unknown }).location
      window.location = { href: 'original' } as Location

      render(<AppCard {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /view details/i }))

      expect(window.location.href).toBe('original')

      window.location = originalLocation
    })
  })

  describe('Button Rendering', () => {
    it('renders Launch App button with correct icon', () => {
      render(<AppCard {...defaultProps} />)

      const launchButton = screen.getByRole('button', { name: /launch app/i })
      expect(launchButton).toBeInTheDocument()
      expect(launchButton.querySelector('svg')).toBeInTheDocument()
    })

    it('renders View Details button with correct icon', () => {
      render(<AppCard {...defaultProps} />)

      const detailsButton = screen.getByRole('button', { name: /view details/i })
      expect(detailsButton).toBeInTheDocument()
      expect(detailsButton.querySelector('svg')).toBeInTheDocument()
    })

    it('buttons have correct variant styles', () => {
      render(<AppCard {...defaultProps} />)

      const launchButton = screen.getByRole('button', { name: /launch app/i })
      const detailsButton = screen.getByRole('button', { name: /view details/i })

      expect(launchButton.className).toContain('flex-1')
      expect(detailsButton.className).toContain('flex-1')
    })
  })

  describe('Description Handling', () => {
    it('renders long description with line-clamp', () => {
      const longDescription = 'This is a very long description that should be clamped to two lines when displayed in the card component to maintain consistent layout'
      const { container } = render(<AppCard {...defaultProps} description={longDescription} />)

      const description = container.querySelector('.line-clamp-2')
      expect(description).toBeInTheDocument()
      expect(description).toHaveTextContent(longDescription)
    })

    it('renders short description normally', () => {
      render(<AppCard {...defaultProps} description="Short" />)

      expect(screen.getByText('Short')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible button labels', () => {
      render(<AppCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /launch app/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument()
    })

    it('card has proper heading structure', () => {
      render(<AppCard {...defaultProps} />)

      const title = screen.getByText('Test App')
      expect(title).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('renders with empty string description', () => {
      render(<AppCard {...defaultProps} description="" />)

      expect(screen.getByText('Test App')).toBeInTheDocument()
    })

    it('renders with special characters in name', () => {
      render(<AppCard {...defaultProps} name="Test & App <>" />)

      expect(screen.getByText('Test & App <>')).toBeInTheDocument()
    })

    it('handles multiple rapid clicks on launch button', async () => {
      const user = userEvent.setup()
      const onLaunch = vi.fn()

      render(<AppCard {...defaultProps} onLaunch={onLaunch} />)

      const launchButton = screen.getByRole('button', { name: /launch app/i })
      await user.click(launchButton)
      await user.click(launchButton)
      await user.click(launchButton)

      expect(onLaunch).toHaveBeenCalledTimes(3)
    })

    it('handles multiple rapid clicks on details button', async () => {
      const user = userEvent.setup()
      const onViewDetails = vi.fn()

      render(<AppCard {...defaultProps} onViewDetails={onViewDetails} />)

      const detailsButton = screen.getByRole('button', { name: /view details/i })
      await user.click(detailsButton)
      await user.click(detailsButton)

      expect(onViewDetails).toHaveBeenCalledTimes(2)
    })
  })
})
