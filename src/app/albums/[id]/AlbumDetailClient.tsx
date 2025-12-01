'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Settings,
  Trash2,
  Lock,
  Globe,
  Link as LinkIcon,
  Copy,
  Check,
  Loader2,
  Sparkles,
  ImageIcon,
} from 'lucide-react'

interface AlbumImage {
  id: string
  name: string
  description: string | null
  originalUrl: string
  enhancedUrl?: string
  enhancementTier?: string
  width: number
  height: number
  sortOrder: number
  createdAt: string
}

interface Album {
  id: string
  name: string
  description: string | null
  privacy: 'PRIVATE' | 'UNLISTED' | 'PUBLIC'
  coverImageId: string | null
  shareToken?: string
  imageCount: number
  isOwner: boolean
  images: AlbumImage[]
  createdAt: string
  updatedAt: string
}

interface AlbumDetailClientProps {
  albumId: string
}

export function AlbumDetailClient({ albumId }: AlbumDetailClientProps) {
  const router = useRouter()
  const [album, setAlbum] = useState<Album | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPrivacy, setEditPrivacy] = useState<
    'PRIVATE' | 'UNLISTED' | 'PUBLIC'
  >('PRIVATE')

  const fetchAlbum = useCallback(async () => {
    try {
      const response = await fetch(`/api/albums/${albumId}`)
      if (response.status === 404) {
        setError('Album not found')
        return
      }
      if (!response.ok) throw new Error('Failed to fetch album')
      const data = await response.json()
      setAlbum(data.album)
      setEditName(data.album.name)
      setEditDescription(data.album.description || '')
      setEditPrivacy(data.album.privacy)
    } catch (err) {
      console.error('Error fetching album:', err)
      setError('Failed to load album')
    } finally {
      setIsLoading(false)
    }
  }, [albumId])

  useEffect(() => {
    fetchAlbum()
  }, [fetchAlbum])

  const handleSaveSettings = async () => {
    if (!editName.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription || null,
          privacy: editPrivacy,
        }),
      })

      if (!response.ok) throw new Error('Failed to update album')

      const data = await response.json()
      setAlbum((prev) =>
        prev
          ? {
              ...prev,
              name: data.album.name,
              description: data.album.description,
              privacy: data.album.privacy,
              shareToken: data.album.shareToken,
            }
          : null
      )
      setShowSettings(false)
    } catch (err) {
      console.error('Error updating album:', err)
      alert('Failed to update album. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAlbum = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this album? Images will not be deleted.'
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete album')

      router.push('/albums')
    } catch (err) {
      console.error('Error deleting album:', err)
      alert('Failed to delete album. Please try again.')
    }
  }

  const handleRemoveImage = async (imageId: string) => {
    if (!confirm('Remove this image from the album?')) return

    try {
      const response = await fetch(`/api/albums/${albumId}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: [imageId] }),
      })

      if (!response.ok) throw new Error('Failed to remove image')

      setAlbum((prev) =>
        prev
          ? {
              ...prev,
              images: prev.images.filter((img) => img.id !== imageId),
              imageCount: prev.imageCount - 1,
            }
          : null
      )
    } catch (err) {
      console.error('Error removing image:', err)
      alert('Failed to remove image. Please try again.')
    }
  }

  const copyShareLink = () => {
    if (!album?.shareToken) return

    const url = `${window.location.origin}/albums/${album.id}?token=${album.shareToken}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getPrivacyIcon = (privacy: Album['privacy']) => {
    switch (privacy) {
      case 'PUBLIC':
        return <Globe className="h-4 w-4" />
      case 'UNLISTED':
        return <LinkIcon className="h-4 w-4" />
      default:
        return <Lock className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error || !album) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {error || 'Album not found'}
            </h3>
            <Button asChild>
              <Link href="/albums">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Albums
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/albums">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{album.name}</h1>
              <Badge variant="secondary" className="gap-1">
                {getPrivacyIcon(album.privacy)}
                {album.privacy === 'PRIVATE'
                  ? 'Private'
                  : album.privacy === 'UNLISTED'
                    ? 'Unlisted'
                    : 'Public'}
              </Badge>
            </div>
            {album.description && (
              <p className="mt-2 text-muted-foreground">{album.description}</p>
            )}
          </div>
          {album.isOwner && (
            <div className="flex gap-2">
              {album.shareToken && album.privacy !== 'PRIVATE' && (
                <Button variant="outline" size="sm" onClick={copyShareLink}>
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {album.imageCount} {album.imageCount === 1 ? 'image' : 'images'}
        </p>
      </div>

      {album.images.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No images yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add images from your enhanced images collection
            </p>
            <Button asChild>
              <Link href="/apps/images">Browse Images</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {album.images.map((image) => (
            <Card key={image.id} className="overflow-hidden group relative">
              <div className="relative aspect-square bg-muted">
                <Image
                  src={image.enhancedUrl || image.originalUrl}
                  alt={image.name || 'Album image'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                {image.enhancedUrl && (
                  <Badge className="absolute top-2 right-2 bg-green-500">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Enhanced
                  </Badge>
                )}
                {album.isOwner && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      asChild
                    >
                      <Link href={`/enhance/${image.id}`}>View</Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveImage(image.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">
                  {image.name || 'Untitled'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {image.width} x {image.height}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Album Settings</DialogTitle>
            <DialogDescription>
              Update your album details and privacy settings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Album Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-privacy">Privacy</Label>
              <Select
                value={editPrivacy}
                onValueChange={(value) =>
                  setEditPrivacy(value as 'PRIVATE' | 'UNLISTED' | 'PUBLIC')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Private
                    </div>
                  </SelectItem>
                  <SelectItem value="UNLISTED">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Unlisted
                    </div>
                  </SelectItem>
                  <SelectItem value="PUBLIC">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Public
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={handleDeleteAlbum}
              className="sm:mr-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Album
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={!editName.trim() || isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
