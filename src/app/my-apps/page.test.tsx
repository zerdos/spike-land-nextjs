import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import MyAppsPage from './page'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

const mockAuth = vi.mocked(auth)
const mockRedirect = vi.mocked(redirect)

describe('MyAppsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should redirect to signin when user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      await MyAppsPage()

      expect(mockAuth).toHaveBeenCalled()
      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin')
    })

    it('should not redirect when user is authenticated', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      })

      const result = await MyAppsPage()

      expect(mockAuth).toHaveBeenCalled()
      expect(mockRedirect).not.toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('Page Layout', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      })
    })

    it('should render page title', async () => {
      const component = await MyAppsPage()
      render(component)

      expect(screen.getByText('My Apps')).toBeInTheDocument()
    })

    it('should render page description', async () => {
      const component = await MyAppsPage()
      render(component)

      expect(
        screen.getByText('Manage and deploy your vibe-coded applications')
      ).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const h1 = container.querySelector('h1')
      expect(h1).toBeInTheDocument()
      expect(h1).toHaveTextContent('My Apps')
    })
  })

  describe('Create New App Button', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      })
    })

    it('should render Create New App button in header', async () => {
      const component = await MyAppsPage()
      render(component)

      const buttons = screen.getAllByRole('button', { name: /Create New App/i })
      expect(buttons[0]).toBeInTheDocument()
    })

    it('should render Create Your First App button in empty state', async () => {
      const component = await MyAppsPage()
      render(component)

      expect(
        screen.getByRole('button', { name: /Create Your First App/i })
      ).toBeInTheDocument()
    })

    it('should have large size buttons', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const buttons = container.querySelectorAll('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('h-10')
      })
    })
  })

  describe('Search and Filter UI', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      })
    })

    it('should render search input', async () => {
      const component = await MyAppsPage()
      render(component)

      const searchInput = screen.getByPlaceholderText('Search apps...')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('type', 'search')
    })

    it('should have disabled search input (not functional yet)', async () => {
      const component = await MyAppsPage()
      render(component)

      const searchInput = screen.getByPlaceholderText('Search apps...')
      expect(searchInput).toBeDisabled()
    })

    it('should have aria-label on search input', async () => {
      const component = await MyAppsPage()
      render(component)

      const searchInput = screen.getByLabelText('Search apps')
      expect(searchInput).toBeInTheDocument()
    })

    it('should render filter badges', async () => {
      const component = await MyAppsPage()
      render(component)

      expect(screen.getByText('All')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })

    it('should have outline variant for filter badges', async () => {
      const component = await MyAppsPage()
      render(component)

      const allBadge = screen.getByText('All')
      expect(allBadge).toHaveClass('text-foreground')
    })

    it('should have disabled styling on filter badges', async () => {
      const component = await MyAppsPage()
      render(component)

      const badges = [
        screen.getByText('All'),
        screen.getByText('Active'),
        screen.getByText('Draft'),
      ]

      badges.forEach((badge) => {
        expect(badge).toHaveClass('cursor-not-allowed')
        expect(badge).toHaveClass('opacity-50')
      })
    })
  })

  describe('Empty State', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      })
    })

    it('should render empty state title', async () => {
      const component = await MyAppsPage()
      render(component)

      expect(screen.getByText('No apps yet')).toBeInTheDocument()
    })

    it('should render empty state description', async () => {
      const component = await MyAppsPage()
      render(component)

      expect(
        screen.getByText(
          'Get started by creating your first vibe-coded application'
        )
      ).toBeInTheDocument()
    })

    it('should render empty state instructions', async () => {
      const component = await MyAppsPage()
      render(component)

      expect(
        screen.getByText((content, element) => {
          return (
            element?.tagName.toLowerCase() === 'p' &&
            content.includes('Click') &&
            content.includes('Create New App') &&
            content.includes('AI-powered development')
          )
        })
      ).toBeInTheDocument()
    })

    it('should show database integration coming soon message', async () => {
      const component = await MyAppsPage()
      render(component)

      expect(
        screen.getByText('Full database integration coming soon')
      ).toBeInTheDocument()
    })

    it('should render empty state card with dashed border', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const dashedCard = container.querySelector('.border-dashed')
      expect(dashedCard).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      })
    })

    it('should have responsive container', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const mainContainer = container.querySelector('.container')
      expect(mainContainer).toBeInTheDocument()
      expect(mainContainer).toHaveClass('mx-auto')
      expect(mainContainer).toHaveClass('px-4')
    })

    it('should have responsive header layout', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const header = container.querySelector('.mb-8')
      expect(header).toHaveClass('flex-col')
      expect(header).toHaveClass('sm:flex-row')
    })

    it('should have responsive search bar layout', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const searchBar = container.querySelector('.mb-6')
      expect(searchBar).toHaveClass('flex-col')
      expect(searchBar).toHaveClass('sm:flex-row')
    })

    it('should have full width button on mobile', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const button = container.querySelector('button')
      expect(button).toHaveClass('w-full')
      expect(button).toHaveClass('sm:w-auto')
    })
  })

  describe('Grid Layout Structure', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      })
    })

    it('should have hidden grid layout for future apps', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const gridContainer = container.querySelector('.mt-8.hidden')
      expect(gridContainer).toBeInTheDocument()
    })

    it('should have responsive grid columns', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const grid = container.querySelector('.grid.gap-6')
      expect(grid).toHaveClass('sm:grid-cols-2')
      expect(grid).toHaveClass('lg:grid-cols-3')
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      })
    })

    it('should have accessible button labels', async () => {
      const component = await MyAppsPage()
      render(component)

      const createButtons = screen.getAllByRole('button')
      createButtons.forEach((button) => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('should have accessible search input', async () => {
      const component = await MyAppsPage()
      render(component)

      const searchInput = screen.getByRole('searchbox', { name: 'Search apps' })
      expect(searchInput).toBeInTheDocument()
    })

    it('should use semantic HTML structure', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const heading = container.querySelector('h1')
      expect(heading).toBeInTheDocument()
    })
  })

  describe('Component Structure', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      })
    })

    it('should use Card component for empty state', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const card = container.querySelector('.rounded-xl')
      expect(card).toBeInTheDocument()
    })

    it('should use Button component from shadcn/ui', async () => {
      const component = await MyAppsPage()
      render(component)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('inline-flex')
        expect(button).toHaveClass('items-center')
      })
    })

    it('should use Badge component for filters', async () => {
      const component = await MyAppsPage()
      render(component)

      const allBadge = screen.getByText('All')
      expect(allBadge).toHaveClass('inline-flex')
      expect(allBadge).toHaveClass('items-center')
      expect(allBadge).toHaveClass('rounded-md')
    })
  })

  describe('Background and Styling', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      })
    })

    it('should have min-height screen', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const mainDiv = container.firstChild
      expect(mainDiv).toHaveClass('min-h-screen')
    })

    it('should have background styling', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const mainDiv = container.firstChild
      expect(mainDiv).toHaveClass('bg-background')
    })

    it('should have responsive padding', async () => {
      const component = await MyAppsPage()
      const { container } = render(component)

      const container2 = container.querySelector('.container')
      expect(container2).toHaveClass('py-8')
      expect(container2).toHaveClass('md:py-12')
    })
  })
})
