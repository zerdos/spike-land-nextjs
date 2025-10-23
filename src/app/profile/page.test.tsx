import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProfilePage from './page'
import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p data-testid="card-description">{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3 data-testid="card-title">{children}</h3>,
}))

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div data-testid="avatar" className={className}>{children}</div>
  ),
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div data-testid="avatar-fallback" className={className}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt: string }) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
}))

describe('ProfilePage', () => {
  const mockAuth = vi.mocked((await import('@/auth')).auth)

  describe('Protected Route Behavior', () => {
    it('should redirect when no session exists', async () => {
      mockAuth.mockResolvedValue(null)
      await ProfilePage()
      expect(redirect).toHaveBeenCalledWith('/auth/signin?callbackUrl=/profile')
    })

    it('should redirect when session exists but user is missing', async () => {
      mockAuth.mockResolvedValue({ expires: '2024-12-31' } as Session)
      await ProfilePage()
      expect(redirect).toHaveBeenCalledWith('/auth/signin?callbackUrl=/profile')
    })

    it('should redirect when session user is null', async () => {
      mockAuth.mockResolvedValue({ user: null, expires: '2024-12-31' } as unknown as Session)
      await ProfilePage()
      expect(redirect).toHaveBeenCalledWith('/auth/signin?callbackUrl=/profile')
    })

    it('should redirect with correct callback URL', async () => {
      mockAuth.mockResolvedValue(null)
      await ProfilePage()
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('callbackUrl=/profile'))
    })
  })

  describe('Rendering with Authenticated User', () => {
    const mockSession: Session = {
      user: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://example.com/avatar.jpg',
      },
      expires: '2024-12-31',
    }

    it('should render page title', async () => {
      mockAuth.mockResolvedValue(mockSession)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByRole('heading', { name: 'Profile', level: 1 })).toBeInTheDocument()
    })

    it('should render user information card', async () => {
      mockAuth.mockResolvedValue(mockSession)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('User Information')).toBeInTheDocument()
    })

    it('should display card description', async () => {
      mockAuth.mockResolvedValue(mockSession)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('Your profile details from your authentication provider')).toBeInTheDocument()
    })

    it('should render about card', async () => {
      mockAuth.mockResolvedValue(mockSession)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('About')).toBeInTheDocument()
    })

    it('should display coming soon message in about card', async () => {
      mockAuth.mockResolvedValue(mockSession)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('Profile pages coming soon')).toBeInTheDocument()
    })
  })

  describe('User Information Display', () => {
    it('should display user name', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should display user email', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
    })

    it('should display user ID', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('user-123')).toBeInTheDocument()
    })

    it('should render avatar image with correct src', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          image: 'https://example.com/avatar.jpg',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      const avatar = screen.getByTestId('avatar-image')
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    })

    it('should render avatar image with correct alt text', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          image: 'https://example.com/avatar.jpg',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      const avatar = screen.getByTestId('avatar-image')
      expect(avatar).toHaveAttribute('alt', 'John Doe')
    })

    it('should display account type as OAuth Provider Account', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('OAuth Provider Account')).toBeInTheDocument()
    })
  })

  describe('User Initials Generation', () => {
    it('should generate two-letter initials from full name', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('should generate initials from single name', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'Madonna',
          email: 'madonna@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('M')).toBeInTheDocument()
    })

    it('should generate initials from three-word name', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'Mary Jane Watson',
          email: 'mary@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('MJ')).toBeInTheDocument()
    })

    it('should generate uppercase initials', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'john doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('JD')).toBeInTheDocument()
    })
  })

  describe('Edge Cases - Missing User Data', () => {
    it('should handle missing user name with default "User"', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('User')).toBeInTheDocument()
    })

    it('should handle missing user name with default initials "U"', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('U')).toBeInTheDocument()
    })

    it('should handle missing user email with "No email"', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('No email')).toBeInTheDocument()
    })

    it('should handle missing user ID with "Not available"', async () => {
      const session: Session = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('Not available')).toBeInTheDocument()
    })

    it('should handle missing avatar image', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      const avatar = screen.getByTestId('avatar-image')
      expect(avatar).toHaveAttribute('src', undefined)
    })

    it('should use fallback avatar when image is missing', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument()
    })
  })

  describe('UI Elements and Layout', () => {
    it('should render container with correct classes', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      const { container } = render(page as React.ReactElement)
      expect(container.querySelector('.container')).toBeInTheDocument()
    })

    it('should render grid layout for cards', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      const { container } = render(page as React.ReactElement)
      expect(container.querySelector('.grid')).toBeInTheDocument()
    })

    it('should render two cards on the page', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      const cards = screen.getAllByTestId('card')
      expect(cards).toHaveLength(2)
    })

    it('should render User ID label', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('User ID')).toBeInTheDocument()
    })

    it('should render Account Type label', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText('Account Type')).toBeInTheDocument()
    })

    it('should render future update message', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      expect(screen.getByText(/Additional profile features like bio, location, and social links/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy with h1', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      const { container } = render(page as React.ReactElement)
      const h1 = container.querySelector('h1')
      expect(h1).toBeInTheDocument()
      expect(h1?.textContent).toBe('Profile')
    })

    it('should have proper heading hierarchy with h2', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      const { container } = render(page as React.ReactElement)
      const h2 = container.querySelector('h2')
      expect(h2).toBeInTheDocument()
    })

    it('should have descriptive labels for form fields', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      render(page as React.ReactElement)
      const labels = screen.getAllByText(/User ID|Account Type/i)
      expect(labels.length).toBeGreaterThan(0)
    })

    it('should use semantic HTML for user information sections', async () => {
      const session: Session = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        expires: '2024-12-31',
      }
      mockAuth.mockResolvedValue(session)
      const page = await ProfilePage()
      const { container } = render(page as React.ReactElement)
      const sections = container.querySelectorAll('.space-y-4')
      expect(sections.length).toBeGreaterThan(0)
    })
  })
})
