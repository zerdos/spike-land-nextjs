import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import AlbumDetailPage, { generateMetadata } from './page'

vi.mock('./AlbumDetailClient', () => ({
  AlbumDetailClient: ({ albumId }: { albumId: string }) => (
    <div data-testid="album-detail-client">Album {albumId}</div>
  ),
}))

describe('AlbumDetailPage', () => {
  it('renders AlbumDetailClient with correct albumId', async () => {
    const params = Promise.resolve({ id: 'test-album-123' })
    const Page = await AlbumDetailPage({ params })
    const { getByTestId } = render(Page)

    expect(getByTestId('album-detail-client')).toHaveTextContent(
      'Album test-album-123'
    )
  })

  describe('generateMetadata', () => {
    it('returns correct metadata', async () => {
      const params = Promise.resolve({ id: 'album-abc' })
      const metadata = await generateMetadata({ params })

      expect(metadata.title).toBe('Album - Spike Land')
      expect(metadata.description).toBe('View album album-abc')
    })
  })
})
