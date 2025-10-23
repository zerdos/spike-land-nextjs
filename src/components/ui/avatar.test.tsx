import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Avatar, AvatarImage, AvatarFallback } from './avatar'

describe('Avatar Component', () => {
  describe('Avatar', () => {
    it('should render avatar container', () => {
      const { container } = render(<Avatar />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<Avatar className="custom-avatar" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar).toHaveClass('custom-avatar')
    })

    it('should have default size classes', () => {
      const { container } = render(<Avatar />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar).toHaveClass('h-10', 'w-10', 'rounded-full')
    })

    it('should forward ref correctly', () => {
      const ref = { current: null }
      render(<Avatar ref={ref} />)
      expect(ref.current).not.toBeNull()
    })

    it('should render children elements', () => {
      render(
        <Avatar>
          <div data-testid="avatar-child">Child</div>
        </Avatar>
      )
      expect(screen.getByTestId('avatar-child')).toBeInTheDocument()
    })

    it('should pass through additional props', () => {
      const { container } = render(<Avatar data-testid="avatar-test" />)
      expect(container.firstChild).toHaveAttribute('data-testid', 'avatar-test')
    })

    it('should merge custom className with default classes', () => {
      const { container } = render(<Avatar className="border-2" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar).toHaveClass('rounded-full', 'border-2')
    })

    it('should have overflow-hidden class', () => {
      const { container } = render(<Avatar />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar).toHaveClass('overflow-hidden')
    })

    it('should have relative positioning', () => {
      const { container } = render(<Avatar />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar).toHaveClass('relative')
    })

    it('should have flex display', () => {
      const { container } = render(<Avatar />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar).toHaveClass('flex')
    })
  })

  describe('AvatarImage', () => {
    it('should render image with src', () => {
      render(
        <Avatar>
          <AvatarImage src="/test.jpg" alt="Test avatar" />
        </Avatar>
      )
      const image = screen.getByRole('img', { hidden: true })
      expect(image).toHaveAttribute('src', '/test.jpg')
    })

    it('should render image with alt text', () => {
      render(
        <Avatar>
          <AvatarImage src="/test.jpg" alt="User avatar" />
        </Avatar>
      )
      const image = screen.getByRole('img', { hidden: true })
      expect(image).toHaveAttribute('alt', 'User avatar')
    })

    it('should apply custom className', () => {
      render(
        <Avatar>
          <AvatarImage src="/test.jpg" className="custom-image" />
        </Avatar>
      )
      const image = screen.getByRole('img', { hidden: true })
      expect(image).toHaveClass('custom-image')
    })

    it('should have aspect-square class', () => {
      render(
        <Avatar>
          <AvatarImage src="/test.jpg" />
        </Avatar>
      )
      const image = screen.getByRole('img', { hidden: true })
      expect(image).toHaveClass('aspect-square')
    })

    it('should have full height and width classes', () => {
      render(
        <Avatar>
          <AvatarImage src="/test.jpg" />
        </Avatar>
      )
      const image = screen.getByRole('img', { hidden: true })
      expect(image).toHaveClass('h-full', 'w-full')
    })

    it('should forward ref correctly', () => {
      const ref = { current: null }
      render(
        <Avatar>
          <AvatarImage ref={ref} src="/test.jpg" />
        </Avatar>
      )
      expect(ref.current).not.toBeNull()
    })

    it('should pass through additional props', () => {
      render(
        <Avatar>
          <AvatarImage src="/test.jpg" data-testid="image-test" />
        </Avatar>
      )
      expect(screen.getByTestId('image-test')).toBeInTheDocument()
    })

    it('should merge custom className with default classes', () => {
      render(
        <Avatar>
          <AvatarImage src="/test.jpg" className="object-cover" />
        </Avatar>
      )
      const image = screen.getByRole('img', { hidden: true })
      expect(image).toHaveClass('aspect-square', 'object-cover')
    })

    it('should render without alt text', () => {
      render(
        <Avatar>
          <AvatarImage src="/test.jpg" />
        </Avatar>
      )
      const image = screen.getByRole('img', { hidden: true })
      expect(image).toBeInTheDocument()
    })

    it('should handle empty src', () => {
      render(
        <Avatar>
          <AvatarImage src="" />
        </Avatar>
      )
      const image = screen.getByRole('img', { hidden: true })
      expect(image).toHaveAttribute('src', '')
    })
  })

  describe('AvatarFallback', () => {
    it('should render fallback text', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      )
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(
        <Avatar>
          <AvatarFallback className="custom-fallback">AB</AvatarFallback>
        </Avatar>
      )
      const fallback = screen.getByText('AB')
      expect(fallback).toHaveClass('custom-fallback')
    })

    it('should have default background class', () => {
      render(
        <Avatar>
          <AvatarFallback>CD</AvatarFallback>
        </Avatar>
      )
      const fallback = screen.getByText('CD')
      expect(fallback).toHaveClass('bg-muted')
    })

    it('should have rounded-full class', () => {
      render(
        <Avatar>
          <AvatarFallback>EF</AvatarFallback>
        </Avatar>
      )
      const fallback = screen.getByText('EF')
      expect(fallback).toHaveClass('rounded-full')
    })

    it('should have flex centering classes', () => {
      render(
        <Avatar>
          <AvatarFallback>GH</AvatarFallback>
        </Avatar>
      )
      const fallback = screen.getByText('GH')
      expect(fallback).toHaveClass('flex', 'items-center', 'justify-center')
    })

    it('should have full height and width classes', () => {
      render(
        <Avatar>
          <AvatarFallback>IJ</AvatarFallback>
        </Avatar>
      )
      const fallback = screen.getByText('IJ')
      expect(fallback).toHaveClass('h-full', 'w-full')
    })

    it('should forward ref correctly', () => {
      const ref = { current: null }
      render(
        <Avatar>
          <AvatarFallback ref={ref}>KL</AvatarFallback>
        </Avatar>
      )
      expect(ref.current).not.toBeNull()
    })

    it('should pass through additional props', () => {
      render(
        <Avatar>
          <AvatarFallback data-testid="fallback-test">MN</AvatarFallback>
        </Avatar>
      )
      expect(screen.getByTestId('fallback-test')).toBeInTheDocument()
    })

    it('should merge custom className with default classes', () => {
      render(
        <Avatar>
          <AvatarFallback className="text-lg">OP</AvatarFallback>
        </Avatar>
      )
      const fallback = screen.getByText('OP')
      expect(fallback).toHaveClass('rounded-full', 'text-lg')
    })

    it('should render single letter initials', () => {
      render(
        <Avatar>
          <AvatarFallback>Q</AvatarFallback>
        </Avatar>
      )
      expect(screen.getByText('Q')).toBeInTheDocument()
    })
  })

  describe('Avatar Composition', () => {
    it('should render avatar with image and fallback', () => {
      render(
        <Avatar>
          <AvatarImage src="/test.jpg" alt="Test" />
          <AvatarFallback>TB</AvatarFallback>
        </Avatar>
      )
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()
      expect(screen.getByText('TB')).toBeInTheDocument()
    })

    it('should show fallback when image fails to load', async () => {
      render(
        <Avatar>
          <AvatarImage src="/invalid.jpg" alt="Invalid" />
          <AvatarFallback>FB</AvatarFallback>
        </Avatar>
      )

      const image = screen.getByRole('img', { hidden: true })

      // Simulate image error
      const errorEvent = new Event('error')
      image.dispatchEvent(errorEvent)

      await waitFor(() => {
        expect(screen.getByText('FB')).toBeVisible()
      })
    })

    it('should render with custom styling on all components', () => {
      const { container } = render(
        <Avatar className="border-4">
          <AvatarImage src="/test.jpg" className="opacity-80" />
          <AvatarFallback className="bg-blue-500">XY</AvatarFallback>
        </Avatar>
      )

      const avatar = container.firstChild as HTMLElement
      expect(avatar).toHaveClass('border-4')

      const image = screen.getByRole('img', { hidden: true })
      expect(image).toHaveClass('opacity-80')

      const fallback = screen.getByText('XY')
      expect(fallback).toHaveClass('bg-blue-500')
    })

    it('should render only fallback without image', () => {
      render(
        <Avatar>
          <AvatarFallback>NO</AvatarFallback>
        </Avatar>
      )
      expect(screen.getByText('NO')).toBeInTheDocument()
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('should render only image without fallback', () => {
      render(
        <Avatar>
          <AvatarImage src="/test.jpg" alt="Only image" />
        </Avatar>
      )
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument()
    })
  })
})
