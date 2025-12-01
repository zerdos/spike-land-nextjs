import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUpload } from './ImageUpload'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock fetch
global.fetch = vi.fn()

describe('ImageUpload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render upload button', () => {
    render(<ImageUpload />)
    expect(screen.getByText('Upload an Image')).toBeInTheDocument()
    expect(screen.getByText('Select Image')).toBeInTheDocument()
  })

  it('should show upload icon when not uploading', () => {
    render(<ImageUpload />)
    // SVG icon should be present (Lucide icon)
    const container = screen.getByText('Upload an Image').parentElement
    expect(container?.querySelector('svg')).toBeInTheDocument()
  })

  it('should show supported file formats message', () => {
    render(<ImageUpload />)
    expect(
      screen.getByText(/Supports JPEG, PNG, and WebP up to 50MB/i)
    ).toBeInTheDocument()
  })

  it('should reject files larger than 50MB', async () => {
    render(<ImageUpload />)

    const file = new File(['a'.repeat(51 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })

    fireEvent.change(input)

    await waitFor(() => {
      expect(
        screen.getByText('File size must be less than 50MB')
      ).toBeInTheDocument()
    })
  })

  it('should reject non-image files', async () => {
    render(<ImageUpload />)

    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })

    fireEvent.change(input)

    await waitFor(() => {
      expect(screen.getByText('Please select an image file')).toBeInTheDocument()
    })
  })

  it('should upload valid image file', async () => {
    const mockResponse = {
      success: true,
      image: {
        id: 'test-image-id',
        name: 'test.png',
      },
    }

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(<ImageUpload />)

    const file = new File(['test'], 'test.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })

    fireEvent.change(input)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/enhance/test-image-id')
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/images/upload',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('should show loading state during upload', async () => {
    // Mock a delayed response
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  success: true,
                  image: { id: 'test-id', name: 'test.png' },
                }),
              }),
            100
          )
        )
    )

    render(<ImageUpload />)

    const file = new File(['test'], 'test.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })

    fireEvent.change(input)

    // Should show uploading state
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument()
    })

    // Wait for upload to complete
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled()
    })
  })

  it('should handle upload error', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Upload failed' }),
    })

    render(<ImageUpload />)

    const file = new File(['test'], 'test.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })

    fireEvent.change(input)

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should handle network error', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network error')
    )

    render(<ImageUpload />)

    const file = new File(['test'], 'test.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })

    fireEvent.change(input)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('should disable input during upload', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  success: true,
                  image: { id: 'test-id', name: 'test.png' },
                }),
              }),
            100
          )
        )
    )

    render(<ImageUpload />)

    const file = new File(['test'], 'test.png', { type: 'image/png' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    })

    fireEvent.change(input)

    // Input should be disabled during upload
    await waitFor(() => {
      expect(input).toBeDisabled()
    })
  })

  it('should clear error when new file is selected', async () => {
    render(<ImageUpload />)

    // First upload - trigger error
    const largeFile = new File(['a'.repeat(51 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    Object.defineProperty(input, 'files', {
      value: [largeFile],
      writable: false,
      configurable: true,
    })

    fireEvent.change(input)

    await waitFor(() => {
      expect(
        screen.getByText('File size must be less than 50MB')
      ).toBeInTheDocument()
    })

    // Second upload - should clear error and succeed
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        image: { id: 'test-id', name: 'test.png' },
      }),
    })

    const validFile = new File(['test'], 'test.png', { type: 'image/png' })

    Object.defineProperty(input, 'files', {
      value: [validFile],
      writable: false,
      configurable: true,
    })

    fireEvent.change(input)

    await waitFor(() => {
      expect(
        screen.queryByText('File size must be less than 50MB')
      ).not.toBeInTheDocument()
    })
  })
})
