import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { EnhancementTier } from '@prisma/client'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/albums/[id] - Get album details with images
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await auth()

  try {
    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        albumImages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            image: {
              select: {
                id: true,
                name: true,
                description: true,
                originalUrl: true,
                originalWidth: true,
                originalHeight: true,
                createdAt: true,
                enhancementJobs: {
                  where: { status: 'COMPLETED' },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  select: {
                    enhancedUrl: true,
                    tier: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { albumImages: true },
        },
      },
    })

    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 })
    }

    // Check access permission
    const isOwner = session?.user?.id === album.userId
    const isAccessible =
      isOwner || album.privacy === 'PUBLIC' || album.privacy === 'UNLISTED'

    if (!isAccessible) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 })
    }

    return NextResponse.json({
      album: {
        id: album.id,
        name: album.name,
        description: album.description,
        privacy: album.privacy,
        coverImageId: album.coverImageId,
        shareToken: isOwner ? album.shareToken : undefined,
        imageCount: album._count.albumImages,
        isOwner,
        images: album.albumImages.map((ai: {
          image: {
            id: string
            name: string
            description: string | null
            originalUrl: string
            enhancementJobs: { enhancedUrl: string | null; tier: EnhancementTier }[]
            originalWidth: number
            originalHeight: number
            createdAt: Date
          }
          sortOrder: number
        }) => ({
          id: ai.image.id,
          name: ai.image.name,
          description: ai.image.description,
          originalUrl: ai.image.originalUrl,
          enhancedUrl: ai.image.enhancementJobs[0]?.enhancedUrl,
          enhancementTier: ai.image.enhancementJobs[0]?.tier,
          width: ai.image.originalWidth,
          height: ai.image.originalHeight,
          sortOrder: ai.sortOrder,
          createdAt: ai.image.createdAt,
        })),
        createdAt: album.createdAt,
        updatedAt: album.updatedAt,
      },
    })
  } catch (error) {
    console.error('Failed to fetch album:', error)
    return NextResponse.json(
      { error: 'Failed to fetch album' },
      { status: 500 }
    )
  }
}

// PATCH /api/albums/[id] - Update album
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check ownership
    const album = await prisma.album.findUnique({
      where: { id },
      select: { userId: true, shareToken: true },
    })

    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 })
    }

    if (album.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, privacy, coverImageId } = body

    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Album name is required' },
          { status: 400 }
        )
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: 'Album name must be 100 characters or less' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (privacy !== undefined) {
      const validPrivacy = ['PRIVATE', 'UNLISTED', 'PUBLIC']
      if (!validPrivacy.includes(privacy)) {
        return NextResponse.json(
          { error: 'Invalid privacy setting' },
          { status: 400 }
        )
      }
      updateData.privacy = privacy

      // Generate share token if changing from private to public/unlisted
      if (privacy !== 'PRIVATE' && !album.shareToken) {
        updateData.shareToken = nanoid(12)
      }
      // Remove share token if changing to private
      if (privacy === 'PRIVATE') {
        updateData.shareToken = null
      }
    }

    if (coverImageId !== undefined) {
      if (coverImageId !== null) {
        // Verify the image exists in the album
        const albumImage = await prisma.albumImage.findFirst({
          where: { albumId: id, imageId: coverImageId },
        })
        if (!albumImage) {
          return NextResponse.json(
            { error: 'Cover image must be in the album' },
            { status: 400 }
          )
        }
      }
      updateData.coverImageId = coverImageId
    }

    const updatedAlbum = await prisma.album.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      album: {
        id: updatedAlbum.id,
        name: updatedAlbum.name,
        description: updatedAlbum.description,
        privacy: updatedAlbum.privacy,
        coverImageId: updatedAlbum.coverImageId,
        shareToken: updatedAlbum.shareToken,
        updatedAt: updatedAlbum.updatedAt,
      },
    })
  } catch (error) {
    console.error('Failed to update album:', error)
    return NextResponse.json(
      { error: 'Failed to update album' },
      { status: 500 }
    )
  }
}

// DELETE /api/albums/[id] - Delete album
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check ownership
    const album = await prisma.album.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 })
    }

    if (album.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.album.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete album:', error)
    return NextResponse.json(
      { error: 'Failed to delete album' },
      { status: 500 }
    )
  }
}
