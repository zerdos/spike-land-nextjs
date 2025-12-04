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
        create: vi.fn().mockImplementation(({ data }) => {
          return Promise.resolve({
            id: `img-${data.name}`,
            userId: data.userId,
            name: data.name,
            originalUrl: data.originalUrl,
            originalR2Key: data.originalR2Key,
            originalWidth: data.originalWidth,
            originalHeight: data.originalHeight,
            originalSizeBytes: data.originalSizeBytes,
            originalFormat: data.originalFormat,
            isPublic: data.isPublic,
          })
        }),
      },
    },
  }
})

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}))

// Helper to create a mock file with arrayBuffer method
function createMockFile(name = 'test.jpg', type = 'image/jpeg', size = 1024) {
  const buffer = Buffer.from('test image content')
  return {
    name,
    type,
    size,
    arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
  }
}

// Mock file type
type MockFile = ReturnType<typeof createMockFile>

// Helper to create a mock request with formData
function createMockRequest(files: MockFile[]): NextRequest {
  const req = new NextRequest('http://localhost/api/images/batch-upload', {
    method: 'POST',
  })

  // Override formData method
  req.formData = vi.fn().mockResolvedValue({
    getAll: (key: string) => (key === 'files' ? files : []),
  })

  return req
}

describe('POST /api/images/batch-upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(await import('@/auth')).auth.mockResolvedValueOnce(null)

    const req = createMockRequest([createMockFile()])
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should return 401 if user id is missing in session', async () => {
    vi.mocked(await import('@/auth')).auth.mockResolvedValueOnce({
      user: { name: 'Test', email: 'test@example.com' },
    })

    const req = createMockRequest([createMockFile()])
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should return 400 if no files provided', async () => {
    const req = createMockRequest([])
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('No files provided')
  })

  it('should return 400 if more than 20 files provided', async () => {
    const files = Array.from({ length: 21 }, (_, i) => createMockFile(`test${i}.jpg`))
    const req = createMockRequest(files)
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Maximum 20 files allowed per batch')
  })

  it('should return 400 if any file exceeds 10MB', async () => {
    const files = [
      createMockFile('test1.jpg', 'image/jpeg', 5 * 1024 * 1024),
      createMockFile('test2.jpg', 'image/jpeg', 11 * 1024 * 1024), // Too large
    ]
    const req = createMockRequest(files)
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('File test2.jpg exceeds maximum size of 10MB')
  })

  it('should return 400 if total batch size exceeds 50MB', async () => {
    const files = [
      createMockFile('test1.jpg', 'image/jpeg', 9 * 1024 * 1024),
      createMockFile('test2.jpg', 'image/jpeg', 9 * 1024 * 1024),
      createMockFile('test3.jpg', 'image/jpeg', 9 * 1024 * 1024),
      createMockFile('test4.jpg', 'image/jpeg', 9 * 1024 * 1024),
      createMockFile('test5.jpg', 'image/jpeg', 9 * 1024 * 1024),
      createMockFile('test6.jpg', 'image/jpeg', 9 * 1024 * 1024), // 54MB total > 50MB
    ]
    const req = createMockRequest(files)
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Total batch size exceeds maximum of 50MB')
  })

  it('should upsert user before uploading images', async () => {
    const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')]
    const req = createMockRequest(files)
    await POST(req)

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

  it('should upload multiple files successfully', async () => {
    const files = [
      createMockFile('test1.jpg'),
      createMockFile('test2.png'),
      createMockFile('test3.webp'),
    ]
    const req = createMockRequest(files)
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.results).toHaveLength(3)
    expect(data.summary.total).toBe(3)
    expect(data.summary.successful).toBe(3)
    expect(data.summary.failed).toBe(0)

    // Check each result
    expect(data.results[0].success).toBe(true)
    expect(data.results[0].filename).toBe('test1.jpg')
    expect(data.results[0].imageId).toBeDefined()
    expect(data.results[1].success).toBe(true)
    expect(data.results[1].filename).toBe('test2.png')
    expect(data.results[2].success).toBe(true)
    expect(data.results[2].filename).toBe('test3.webp')
  })

  it('should handle partial upload failure', async () => {
    const { processAndUploadImage } = await import('@/lib/storage/upload-handler')

    // First file succeeds, second fails
    vi.mocked(processAndUploadImage)
      .mockResolvedValueOnce({
        success: true,
        url: 'https://r2.dev/images/test1.jpg',
        r2Key: 'users/user-123/originals/test1.jpg',
        width: 1920,
        height: 1080,
        sizeBytes: 1024000,
        format: 'jpeg',
        imageId: 'img-1',
      })
      .mockResolvedValueOnce({
        success: false,
        error: 'Processing failed',
        url: '',
        r2Key: '',
        width: 0,
        height: 0,
        sizeBytes: 0,
        format: '',
        imageId: '',
      })

    const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')]
    const req = createMockRequest(files)
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.results).toHaveLength(2)
    expect(data.results[0].success).toBe(true)
    expect(data.results[1].success).toBe(false)
    expect(data.results[1].error).toBe('Processing failed')
    expect(data.summary.successful).toBe(1)
    expect(data.summary.failed).toBe(1)
  })

  it('should handle individual file processing error', async () => {
    const { processAndUploadImage } = await import('@/lib/storage/upload-handler')

    vi.mocked(processAndUploadImage)
      .mockResolvedValueOnce({
        success: true,
        url: 'https://r2.dev/images/test1.jpg',
        r2Key: 'users/user-123/originals/test1.jpg',
        width: 1920,
        height: 1080,
        sizeBytes: 1024000,
        format: 'jpeg',
        imageId: 'img-1',
      })
      .mockRejectedValueOnce(new Error('Network error'))

    const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')]
    const req = createMockRequest(files)
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.results).toHaveLength(2)
    expect(data.results[0].success).toBe(true)
    expect(data.results[1].success).toBe(false)
    expect(data.results[1].error).toBe('Network error')
  })

  it('should handle database creation failure for individual file', async () => {
    mockPrisma.enhancedImage.create
      .mockResolvedValueOnce({
        id: 'img-test1.jpg',
        userId: 'user-123',
        name: 'test1.jpg',
        originalUrl: 'https://r2.dev/images/test1.jpg',
        originalR2Key: 'users/user-123/originals/test1.jpg',
        originalWidth: 1920,
        originalHeight: 1080,
        originalSizeBytes: 1024000,
        originalFormat: 'jpeg',
        isPublic: false,
      })
      .mockRejectedValueOnce(new Error('Database error'))

    const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')]
    const req = createMockRequest(files)
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.results).toHaveLength(2)
    expect(data.results[0].success).toBe(true)
    expect(data.results[1].success).toBe(false)
    expect(data.results[1].error).toBe('Database error')
  })

  it('should upload exactly 20 files successfully', async () => {
    const files = Array.from({ length: 20 }, (_, i) => createMockFile(`test${i}.jpg`))
    const req = createMockRequest(files)
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.results).toHaveLength(20)
    expect(data.summary.total).toBe(20)
    expect(data.summary.successful).toBe(20)
  })

  it('should handle user upsert failure gracefully', async () => {
    mockPrisma.user.upsert.mockRejectedValueOnce(new Error('Database connection failed'))

    const files = [createMockFile('test1.jpg')]
    const req = createMockRequest(files)
    const res = await POST(req)
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Database connection failed')
  })

  it('should return all metadata for successfully uploaded images', async () => {
    const files = [createMockFile('test1.jpg')]
    const req = createMockRequest(files)
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.results[0]).toEqual({
      success: true,
      filename: 'test1.jpg',
      imageId: 'img-test1.jpg',
      url: 'https://r2.dev/images/test.jpg',
      width: 1920,
      height: 1080,
      size: 1024000,
      format: 'jpeg',
    })
  })

  it('should handle all files failing', async () => {
    const { processAndUploadImage } = await import('@/lib/storage/upload-handler')

    vi.mocked(processAndUploadImage).mockResolvedValue({
      success: false,
      error: 'Upload failed',
      url: '',
      r2Key: '',
      width: 0,
      height: 0,
      sizeBytes: 0,
      format: '',
      imageId: '',
    })

    const files = [createMockFile('test1.jpg'), createMockFile('test2.jpg')]
    const req = createMockRequest(files)
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.summary.successful).toBe(0)
    expect(data.summary.failed).toBe(2)
  })

  it('should sync user profile data on batch upload', async () => {
    const updatedSession = {
      user: {
        id: 'user-123',
        name: 'Updated Name',
        email: 'updated@example.com',
        image: 'https://example.com/new-avatar.jpg',
      },
    }
    vi.mocked(await import('@/auth')).auth.mockResolvedValueOnce(updatedSession)

    const files = [createMockFile('test1.jpg')]
    const req = createMockRequest(files)
    await POST(req)

    expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      update: {
        name: 'Updated Name',
        email: 'updated@example.com',
        image: 'https://example.com/new-avatar.jpg',
      },
      create: {
        id: 'user-123',
        name: 'Updated Name',
        email: 'updated@example.com',
        image: 'https://example.com/new-avatar.jpg',
      },
    })
  })
})
