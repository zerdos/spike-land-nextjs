import { describe, it, expect, vi, Mock } from 'vitest'
import { redirect } from 'next/navigation'
import AlbumsPage from './page'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('./AlbumsClient', () => ({
  AlbumsClient: () => <div data-testid="albums-client">Albums Client</div>,
}))

import { auth } from '@/auth'

describe('AlbumsPage', () => {
  it('redirects to login when user is not authenticated', async () => {
    ;(auth as Mock).mockResolvedValue(null)

    await AlbumsPage()

    expect(redirect).toHaveBeenCalledWith('/?callbackUrl=/albums')
  })

  it('redirects when session has no user id', async () => {
    ;(auth as Mock).mockResolvedValue({ user: {} })

    await AlbumsPage()

    expect(redirect).toHaveBeenCalledWith('/?callbackUrl=/albums')
  })

  it('renders AlbumsClient when user is authenticated', async () => {
    ;(auth as Mock).mockResolvedValue({
      user: { id: 'user_123' },
    })

    const result = await AlbumsPage()

    expect(result).toBeDefined()
  })
})
