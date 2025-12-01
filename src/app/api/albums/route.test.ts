import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    album: {
      findMany: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}))

vi.mock('nanoid', () => ({
  nanoid: () => 'test-token-123',
}))

import { auth } from '@/auth'
import prisma from '@/lib/prisma'

describe('Albums API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/albums', () => {
    it('returns 401 when user is not authenticated', async () => {
      ;(auth as Mock).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns empty albums array when user has no albums', async () => {
      ;(auth as Mock).mockResolvedValue({
        user: { id: 'user_123' },
      })
      ;(prisma.album.findMany as Mock).mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.albums).toEqual([])
    })

    it('returns albums with preview images', async () => {
      ;(auth as Mock).mockResolvedValue({
        user: { id: 'user_123' },
      })
      ;(prisma.album.findMany as Mock).mockResolvedValue([
        {
          id: 'album_1',
          name: 'Test Album',
          description: 'Test description',
          privacy: 'PRIVATE',
          coverImageId: null,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
          albumImages: [
            {
              image: {
                id: 'img_1',
                originalUrl: 'https://example.com/img1.jpg',
                name: 'Image 1',
              },
            },
          ],
          _count: { albumImages: 1 },
        },
      ])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.albums).toHaveLength(1)
      expect(data.albums[0].name).toBe('Test Album')
      expect(data.albums[0].imageCount).toBe(1)
      expect(data.albums[0].previewImages).toHaveLength(1)
    })
  })

  describe('POST /api/albums', () => {
    it('returns 401 when user is not authenticated', async () => {
      ;(auth as Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/albums', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Album' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 when name is missing', async () => {
      ;(auth as Mock).mockResolvedValue({
        user: { id: 'user_123' },
      })

      const request = new NextRequest('http://localhost:3000/api/albums', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Album name is required')
    })

    it('returns 400 when name is empty', async () => {
      ;(auth as Mock).mockResolvedValue({
        user: { id: 'user_123' },
      })

      const request = new NextRequest('http://localhost:3000/api/albums', {
        method: 'POST',
        body: JSON.stringify({ name: '   ' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Album name is required')
    })

    it('returns 400 when name exceeds 100 characters', async () => {
      ;(auth as Mock).mockResolvedValue({
        user: { id: 'user_123' },
      })

      const request = new NextRequest('http://localhost:3000/api/albums', {
        method: 'POST',
        body: JSON.stringify({ name: 'a'.repeat(101) }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Album name must be 100 characters or less')
    })

    it('returns 400 for invalid privacy setting', async () => {
      ;(auth as Mock).mockResolvedValue({
        user: { id: 'user_123' },
      })

      const request = new NextRequest('http://localhost:3000/api/albums', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', privacy: 'INVALID' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid privacy setting')
    })

    it('creates a private album successfully', async () => {
      ;(auth as Mock).mockResolvedValue({
        user: { id: 'user_123' },
      })
      ;(prisma.album.aggregate as Mock).mockResolvedValue({
        _max: { sortOrder: 0 },
      })
      ;(prisma.album.create as Mock).mockResolvedValue({
        id: 'album_1',
        name: 'Test Album',
        description: null,
        privacy: 'PRIVATE',
        shareToken: null,
        createdAt: new Date('2025-01-01'),
      })

      const request = new NextRequest('http://localhost:3000/api/albums', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Album' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.album.name).toBe('Test Album')
      expect(data.album.privacy).toBe('PRIVATE')
      expect(data.album.shareToken).toBeNull()
    })

    it('creates a public album with share token', async () => {
      ;(auth as Mock).mockResolvedValue({
        user: { id: 'user_123' },
      })
      ;(prisma.album.aggregate as Mock).mockResolvedValue({
        _max: { sortOrder: null },
      })
      ;(prisma.album.create as Mock).mockResolvedValue({
        id: 'album_1',
        name: 'Public Album',
        description: 'A public album',
        privacy: 'PUBLIC',
        shareToken: 'test-token-123',
        createdAt: new Date('2025-01-01'),
      })

      const request = new NextRequest('http://localhost:3000/api/albums', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Public Album',
          description: 'A public album',
          privacy: 'PUBLIC',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.album.privacy).toBe('PUBLIC')
      expect(data.album.shareToken).toBe('test-token-123')
    })
  })
})
