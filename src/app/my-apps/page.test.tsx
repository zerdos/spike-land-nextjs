import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import MyAppsPage from './page'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    app: {
      findMany: vi.fn(),
    },
    enhancedImage: {
      findMany: vi.fn(),
    },
    imageEnhancementJob: {
      findMany: vi.fn(),
    },
  },
}))

const mockAuth = vi.mocked(auth)
const mockRedirect = vi.mocked(redirect)
const mockPrisma = vi.mocked(prisma)

describe('MyAppsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should redirect to signin when user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      mockRedirect.mockImplementation((url: string) => {
        throw new Error(`REDIRECT:${url}`)
      })

      try {
        await MyAppsPage()
      } catch (error) {
        expect((error as Error).message).toBe('REDIRECT:/auth/signin')
      }

      expect(mockAuth).toHaveBeenCalled()
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

      mockPrisma.app.findMany.mockResolvedValue([])

      const result = await MyAppsPage()

      expect(mockAuth).toHaveBeenCalled()
      expect(mockRedirect).not.toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should fetch apps for authenticated user', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      })

      mockPrisma.app.findMany.mockResolvedValue([])

      await MyAppsPage()

      expect(mockPrisma.app.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          status: {
            not: 'DELETED',
          },
        },
        include: {
          requirements: true,
          monetizationModels: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
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
      mockPrisma.app.findMany.mockResolvedValue([])
      mockPrisma.enhancedImage.findMany.mockResolvedValue([])
      mockPrisma.imageEnhancementJob.findMany.mockResolvedValue([])
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
        screen.getByText('Manage your applications and enhanced images')
      ).toBeInTheDocument()
    })

    it('should render empty state when no apps', async () => {
      const component = await MyAppsPage()
      render(component)

      expect(screen.getByText('No apps yet')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Get started by creating your first vibe-coded application'
        )
      ).toBeInTheDocument()
    })

    it('should render Create New App button', async () => {
      const component = await MyAppsPage()
      render(component)

      const buttons = screen.getAllByText('Create New App')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Apps List', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2025-12-31',
      })
      mockPrisma.enhancedImage.findMany.mockResolvedValue([])
      mockPrisma.imageEnhancementJob.findMany.mockResolvedValue([])
    })

    it('should render apps when they exist', async () => {
      const mockApps = [
        {
          id: 'app-1',
          name: 'Test App 1',
          description: 'Description 1',
          userId: 'user-123',
          status: 'DRAFT' as const,
          forkedFrom: null,
          domain: null,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          requirements: [
            {
              id: 'req-1',
              appId: 'app-1',
              description: 'Requirement 1',
              priority: 'MEDIUM' as const,
              status: 'PENDING' as const,
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          monetizationModels: [
            {
              id: 'mon-1',
              appId: 'app-1',
              type: 'FREE' as const,
              price: null,
              subscriptionInterval: null,
              features: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
        {
          id: 'app-2',
          name: 'Test App 2',
          description: 'Description 2',
          userId: 'user-123',
          status: 'ACTIVE' as const,
          forkedFrom: null,
          domain: null,
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date('2025-01-02'),
          requirements: [],
          monetizationModels: [],
        },
      ]

      mockPrisma.app.findMany.mockResolvedValue(mockApps)

      const component = await MyAppsPage()
      render(component)

      expect(screen.getByText('Test App 1')).toBeInTheDocument()
      expect(screen.getByText('Test App 2')).toBeInTheDocument()
      expect(screen.getByText('Description 1')).toBeInTheDocument()
      expect(screen.getByText('Description 2')).toBeInTheDocument()
    })

    it('should display app status badges', async () => {
      const mockApps = [
        {
          id: 'app-1',
          name: 'Draft App',
          description: 'A draft app',
          userId: 'user-123',
          status: 'DRAFT' as const,
          forkedFrom: null,
          domain: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          requirements: [],
          monetizationModels: [],
        },
        {
          id: 'app-2',
          name: 'Active App',
          description: 'An active app',
          userId: 'user-123',
          status: 'ACTIVE' as const,
          forkedFrom: null,
          domain: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          requirements: [],
          monetizationModels: [],
        },
      ]

      mockPrisma.app.findMany.mockResolvedValue(mockApps)

      const component = await MyAppsPage()
      render(component)

      expect(screen.getByText('DRAFT')).toBeInTheDocument()
      expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    })

    it('should display app requirements count', async () => {
      const mockApps = [
        {
          id: 'app-1',
          name: 'Test App',
          description: 'Description',
          userId: 'user-123',
          status: 'DRAFT' as const,
          forkedFrom: null,
          domain: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          requirements: [
            {
              id: 'req-1',
              appId: 'app-1',
              description: 'Req 1',
              priority: 'MEDIUM' as const,
              status: 'PENDING' as const,
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'req-2',
              appId: 'app-1',
              description: 'Req 2',
              priority: 'HIGH' as const,
              status: 'IN_PROGRESS' as const,
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          monetizationModels: [],
        },
      ]

      mockPrisma.app.findMany.mockResolvedValue(mockApps)

      const component = await MyAppsPage()
      render(component)

      const requirementsText = screen.getByText(/Requirements:/)
      expect(requirementsText).toBeInTheDocument()
      expect(requirementsText.parentElement?.textContent).toContain('Requirements: 2')
    })

    it('should display monetization model', async () => {
      const mockApps = [
        {
          id: 'app-1',
          name: 'Test App',
          description: 'Description',
          userId: 'user-123',
          status: 'DRAFT' as const,
          forkedFrom: null,
          domain: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          requirements: [],
          monetizationModels: [
            {
              id: 'mon-1',
              appId: 'app-1',
              type: 'SUBSCRIPTION' as const,
              price: null,
              subscriptionInterval: 'MONTHLY' as const,
              features: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ]

      mockPrisma.app.findMany.mockResolvedValue(mockApps)

      const component = await MyAppsPage()
      render(component)

      expect(screen.getByText(/Monetization:/)).toBeInTheDocument()
      expect(screen.getByText(/SUBSCRIPTION/)).toBeInTheDocument()
    })

    it('should show filter badges with counts', async () => {
      const mockApps = [
        {
          id: 'app-1',
          name: 'App 1',
          description: 'Desc',
          userId: 'user-123',
          status: 'DRAFT' as const,
          forkedFrom: null,
          domain: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          requirements: [],
          monetizationModels: [],
        },
        {
          id: 'app-2',
          name: 'App 2',
          description: 'Desc',
          userId: 'user-123',
          status: 'ACTIVE' as const,
          forkedFrom: null,
          domain: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          requirements: [],
          monetizationModels: [],
        },
        {
          id: 'app-3',
          name: 'App 3',
          description: 'Desc',
          userId: 'user-123',
          status: 'ACTIVE' as const,
          forkedFrom: null,
          domain: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          requirements: [],
          monetizationModels: [],
        },
      ]

      mockPrisma.app.findMany.mockResolvedValue(mockApps)

      const component = await MyAppsPage()
      render(component)

      expect(screen.getByText(/All \(3\)/)).toBeInTheDocument()
      expect(screen.getByText(/Active \(2\)/)).toBeInTheDocument()
      expect(screen.getByText(/Draft \(1\)/)).toBeInTheDocument()
    })
  })
})
