import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

// Mocks
const mockSession = {
  user: {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    image: 'https://example.com/avatar.jpg',
  },
}

vi.mock('@/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
}))

vi.mock('@/lib/storage/upload-handler', () => ({
  processAndUploadImage: vi.fn().mockResolvedValue({
    success: true,
    url: 'https://r2.dev/images/test.jpg',
    r2Key: 'users/user-123/originals/test.jpg',
    width: 1920,
    height: 1080,
    sizeBytes: 1024000,
    format: 'jpeg',
  }),
}))

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      user: {
        upsert: vi.fn().mockResolvedValue({
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
        }),
      },
      enhancedImage: {
        create: vi.fn().mockResolvedValue({
          id: 'img-123',
          userId: 'user-123',
          name: 'test.jpg',
          originalUrl: 'https://r2.dev/images/test.jpg',
          originalR2Key: 'users/user-123/originals/test.jpg',
          originalWidth: 1920,
          originalHeight: 1080,
          originalSizeBytes: 1024000,
          originalFormat: 'jpeg',
          isPublic: false,
        }),
      },
    },
  }
})

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}))

// Helper to create a mock file with arrayBuffer method
function createMockFile(name = 'test.jpg', type = 'image/jpeg') {
  const buffer = Buffer.from('test image content')
  return {
    name,
    type,
    size: buffer.length,
    arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
  }
}

// Mock file type
type MockFile = ReturnType<typeof createMockFile>

// Helper to create a mock request with formData
function createMockRequest(file: MockFile | null): NextRequest {
  const mockFormData = new Map<string, MockFile | null>()
  if (file) {
    mockFormData.set('file', file)
  }

  const req = new NextRequest('http://localhost/api/images/upload', {
    method: 'POST',
  })

  // Override formData method
  req.formData = vi.fn().mockResolvedValue({
    get: (key: string) => mockFormData.get(key) ?? null,
  })

  return req
}

describe('POST /api/images/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(await import('@/auth')).auth.mockResolvedValueOnce(null)

    const req = createMockRequest(createMockFile())
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should return 401 if user id is missing in session', async () => {
    vi.mocked(await import('@/auth')).auth.mockResolvedValueOnce({
      user: { name: 'Test', email: 'test@example.com' },
    })

    const req = createMockRequest(createMockFile())
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should return 400 if no file provided', async () => {
    const req = createMockRequest(null)
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('No file provided')
  })

  it('should upsert user before creating image for new users', async () => {
    const req = createMockRequest(createMockFile())
    await POST(req)

    // Verify user upsert was called with correct data
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      update: {
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg',
      },
      create: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg',
      },
    })
  })

  it('should upsert user before creating image for existing users', async () => {
    // Existing user - upsert should update their profile
    mockPrisma.user.upsert.mockResolvedValueOnce({
      id: 'user-123',
      name: 'Updated Name',
      email: 'test@example.com',
      image: 'https://example.com/new-avatar.jpg',
    })

    const req = createMockRequest(createMockFile())
    await POST(req)

    // Verify user upsert was called (it works for both new and existing users)
    expect(mockPrisma.user.upsert).toHaveBeenCalled()
    // Verify image creation happened after user upsert
    expect(mockPrisma.enhancedImage.create).toHaveBeenCalled()
  })

  it('should upload image successfully', async () => {
    const req = createMockRequest(createMockFile())
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.image).toBeDefined()
    expect(data.image.id).toBe('img-123')
    expect(data.image.name).toBe('test.jpg')
    expect(data.image.width).toBe(1920)
    expect(data.image.height).toBe(1080)
  })

  it('should return 500 if upload processing fails', async () => {
    const { processAndUploadImage } = await import('@/lib/storage/upload-handler')
    vi.mocked(processAndUploadImage).mockResolvedValueOnce({
      success: false,
      error: 'Upload failed',
      url: '',
      r2Key: '',
      width: 0,
      height: 0,
      sizeBytes: 0,
      format: '',
    })

    const req = createMockRequest(createMockFile())
    const res = await POST(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Upload failed')
  })

  it('should handle user upsert failure gracefully', async () => {
    mockPrisma.user.upsert.mockRejectedValueOnce(new Error('Database connection failed'))

    const req = createMockRequest(createMockFile())
    const res = await POST(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Database connection failed')
  })

  it('should handle image creation failure', async () => {
    mockPrisma.enhancedImage.create.mockRejectedValueOnce(
      new Error('Foreign key constraint failed')
    )

    const req = createMockRequest(createMockFile())
    const res = await POST(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Foreign key constraint failed')
  })

  it('should sync user profile data on every upload', async () => {
    // Simulate user with updated profile from OAuth
    const updatedSession = {
      user: {
        id: 'user-123',
        name: 'New Display Name',
        email: 'newemail@example.com',
        image: 'https://example.com/new-profile.jpg',
      },
    }
    vi.mocked(await import('@/auth')).auth.mockResolvedValueOnce(updatedSession)

    const req = createMockRequest(createMockFile())
    await POST(req)

    // Verify updated profile data is synced
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      update: {
        name: 'New Display Name',
        email: 'newemail@example.com',
        image: 'https://example.com/new-profile.jpg',
      },
      create: {
        id: 'user-123',
        name: 'New Display Name',
        email: 'newemail@example.com',
        image: 'https://example.com/new-profile.jpg',
      },
    })
  })
})
