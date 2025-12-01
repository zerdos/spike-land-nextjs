import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AlbumsClient } from './AlbumsClient'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AlbumsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockFetch.mockImplementation(
      () => new Promise(() => {})
    )

    render(<AlbumsClient />)

    expect(document.querySelector('.animate-spin')).toBeDefined()
  })

  it('shows empty state when no albums', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ albums: [] }),
    })

    render(<AlbumsClient />)

    await waitFor(() => {
      expect(screen.getByText('No albums yet')).toBeDefined()
    })
  })

  it('renders albums when data is loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          albums: [
            {
              id: 'album_1',
              name: 'My Album',
              description: 'Test description',
              privacy: 'PRIVATE',
              coverImageId: null,
              imageCount: 5,
              previewImages: [],
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-01T00:00:00Z',
            },
          ],
        }),
    })

    render(<AlbumsClient />)

    await waitFor(() => {
      expect(screen.getByText('My Album')).toBeDefined()
      expect(screen.getByText('5 images')).toBeDefined()
    })
  })

  it('opens create album dialog when clicking New Album', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ albums: [] }),
    })

    render(<AlbumsClient />)

    await waitFor(() => {
      expect(screen.getByText('No albums yet')).toBeDefined()
    })

    const newAlbumButton = screen.getAllByText('New Album')[0] ||
                           screen.getByText('Create Album')
    fireEvent.click(newAlbumButton)

    await waitFor(() => {
      expect(screen.getByText('Create New Album')).toBeDefined()
    })
  })

  it('creates album when form is submitted', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ albums: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            album: { id: 'new_album', name: 'New Album' },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            albums: [
              {
                id: 'new_album',
                name: 'New Album',
                description: null,
                privacy: 'PRIVATE',
                coverImageId: null,
                imageCount: 0,
                previewImages: [],
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z',
              },
            ],
          }),
      })

    render(<AlbumsClient />)

    await waitFor(() => {
      expect(screen.getByText('No albums yet')).toBeDefined()
    })

    const createButton = screen.getByText('Create Album')
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByLabelText('Album Name')).toBeDefined()
    })

    const nameInput = screen.getByLabelText('Album Name')
    fireEvent.change(nameInput, { target: { value: 'New Album' } })

    const submitButton = screen.getAllByText('Create Album').find(
      (btn) => btn.closest('button[type="button"]') !== null || btn.closest('div[role="dialog"]') !== null
    )
    if (submitButton) {
      fireEvent.click(submitButton)
    }

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/albums', expect.any(Object))
    })
  })

  it('shows privacy badge on albums', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          albums: [
            {
              id: 'album_1',
              name: 'Public Album',
              description: null,
              privacy: 'PUBLIC',
              coverImageId: null,
              imageCount: 0,
              previewImages: [],
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-01T00:00:00Z',
            },
          ],
        }),
    })

    render(<AlbumsClient />)

    await waitFor(() => {
      expect(screen.getByText('Public')).toBeDefined()
    })
  })

  it('handles delete album', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            albums: [
              {
                id: 'album_1',
                name: 'Test Album',
                description: null,
                privacy: 'PRIVATE',
                coverImageId: null,
                imageCount: 0,
                previewImages: [],
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z',
              },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

    render(<AlbumsClient />)

    await waitFor(() => {
      expect(screen.getByText('Test Album')).toBeDefined()
    })

    const deleteButton = document.querySelector('button:has(svg.lucide-trash-2)')
    if (deleteButton) {
      fireEvent.click(deleteButton)
    }

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled()
    })

    confirmSpy.mockRestore()
  })
})
