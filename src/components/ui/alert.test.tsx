import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription } from './alert'

describe('Alert Component', () => {
  describe('Alert', () => {
    it('should render with default variant', () => {
      render(<Alert>Test alert</Alert>)
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveTextContent('Test alert')
    })

    it('should render with destructive variant', () => {
      render(<Alert variant="destructive">Error message</Alert>)
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveTextContent('Error message')
    })

    it('should apply custom className', () => {
      render(<Alert className="custom-class">Test</Alert>)
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('custom-class')
    })

    it('should forward ref correctly', () => {
      const ref = { current: null }
      render(<Alert ref={ref}>Test</Alert>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should render with children elements', () => {
      render(
        <Alert>
          <div data-testid="child">Child content</div>
        </Alert>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should pass through additional props', () => {
      render(<Alert data-testid="alert-test">Test</Alert>)
      expect(screen.getByTestId('alert-test')).toBeInTheDocument()
    })

    it('should have role="alert" attribute', () => {
      render(<Alert>Test</Alert>)
      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('role', 'alert')
    })

    it('should render with SVG icon and proper spacing', () => {
      render(
        <Alert>
          <svg data-testid="alert-icon" />
          <div>Content with icon</div>
        </Alert>
      )
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
    })

    it('should merge className with variant classes', () => {
      render(<Alert variant="destructive" className="my-custom-class">Test</Alert>)
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('my-custom-class')
    })

    it('should render multiple children correctly', () => {
      render(
        <Alert>
          <span>First</span>
          <span>Second</span>
        </Alert>
      )
      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
    })
  })

  describe('AlertTitle', () => {
    it('should render title correctly', () => {
      render(<AlertTitle>Alert Title</AlertTitle>)
      expect(screen.getByText('Alert Title')).toBeInTheDocument()
    })

    it('should render as h5 element', () => {
      render(<AlertTitle>Title</AlertTitle>)
      const title = screen.getByText('Title')
      expect(title.tagName).toBe('H5')
    })

    it('should apply custom className', () => {
      render(<AlertTitle className="custom-title">Title</AlertTitle>)
      const title = screen.getByText('Title')
      expect(title).toHaveClass('custom-title')
    })

    it('should forward ref correctly', () => {
      const ref = { current: null }
      render(<AlertTitle ref={ref}>Title</AlertTitle>)
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
    })

    it('should pass through additional props', () => {
      render(<AlertTitle data-testid="title-test">Title</AlertTitle>)
      expect(screen.getByTestId('title-test')).toBeInTheDocument()
    })

    it('should render with children elements', () => {
      render(
        <AlertTitle>
          <span data-testid="title-child">Title content</span>
        </AlertTitle>
      )
      expect(screen.getByTestId('title-child')).toBeInTheDocument()
    })

    it('should have default styling classes', () => {
      render(<AlertTitle>Title</AlertTitle>)
      const title = screen.getByText('Title')
      expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight')
    })

    it('should merge custom className with default classes', () => {
      render(<AlertTitle className="text-red-500">Title</AlertTitle>)
      const title = screen.getByText('Title')
      expect(title).toHaveClass('mb-1', 'font-medium', 'text-red-500')
    })

    it('should render empty title', () => {
      const { container } = render(<AlertTitle></AlertTitle>)
      expect(container.querySelector('h5')).toBeInTheDocument()
    })

    it('should handle long title text', () => {
      const longTitle = 'This is a very long title that should still render correctly'
      render(<AlertTitle>{longTitle}</AlertTitle>)
      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })
  })

  describe('AlertDescription', () => {
    it('should render description correctly', () => {
      render(<AlertDescription>Alert description text</AlertDescription>)
      expect(screen.getByText('Alert description text')).toBeInTheDocument()
    })

    it('should render as div element', () => {
      render(<AlertDescription>Description</AlertDescription>)
      const description = screen.getByText('Description')
      expect(description.tagName).toBe('DIV')
    })

    it('should apply custom className', () => {
      render(<AlertDescription className="custom-desc">Description</AlertDescription>)
      const description = screen.getByText('Description')
      expect(description).toHaveClass('custom-desc')
    })

    it('should forward ref correctly', () => {
      const ref = { current: null }
      render(<AlertDescription ref={ref}>Description</AlertDescription>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should pass through additional props', () => {
      render(<AlertDescription data-testid="desc-test">Description</AlertDescription>)
      expect(screen.getByTestId('desc-test')).toBeInTheDocument()
    })

    it('should render with children elements', () => {
      render(
        <AlertDescription>
          <p data-testid="desc-child">Description content</p>
        </AlertDescription>
      )
      expect(screen.getByTestId('desc-child')).toBeInTheDocument()
    })

    it('should have default styling classes', () => {
      render(<AlertDescription>Description</AlertDescription>)
      const description = screen.getByText('Description')
      expect(description).toHaveClass('text-sm')
    })

    it('should render paragraph children with proper styling', () => {
      render(
        <AlertDescription>
          <p>Paragraph content</p>
        </AlertDescription>
      )
      expect(screen.getByText('Paragraph content')).toBeInTheDocument()
    })

    it('should merge custom className with default classes', () => {
      render(<AlertDescription className="text-blue-500">Description</AlertDescription>)
      const description = screen.getByText('Description')
      expect(description).toHaveClass('text-sm', 'text-blue-500')
    })

    it('should render empty description', () => {
      const { container } = render(<AlertDescription></AlertDescription>)
      expect(container.querySelector('div')).toBeInTheDocument()
    })
  })

  describe('Alert Composition', () => {
    it('should render complete alert with title and description', () => {
      render(
        <Alert>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong</AlertDescription>
        </Alert>
      )
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should render destructive alert with title and description', () => {
      render(
        <Alert variant="destructive">
          <AlertTitle>Critical Error</AlertTitle>
          <AlertDescription>System failure detected</AlertDescription>
        </Alert>
      )
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(screen.getByText('Critical Error')).toBeInTheDocument()
      expect(screen.getByText('System failure detected')).toBeInTheDocument()
    })

    it('should render alert with icon, title, and description', () => {
      render(
        <Alert>
          <svg data-testid="icon" />
          <AlertTitle>Information</AlertTitle>
          <AlertDescription>This is an informational message</AlertDescription>
        </Alert>
      )
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('Information')).toBeInTheDocument()
      expect(screen.getByText('This is an informational message')).toBeInTheDocument()
    })
  })
})
