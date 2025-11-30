'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react'

export function ImageUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File size must be less than 50MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await response.json()
      router.push(`/enhance/${data.image.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPreview(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className="p-8 border-dashed">
      <div className="space-y-4">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10">
            {preview ? (
              <ImageIcon className="h-12 w-12 text-primary" />
            ) : (
              <Upload className="h-12 w-12 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">Upload Image to Enhance</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Support for JPG, PNG, WebP up to 50MB
            </p>
          </div>

          {preview && !isUploading && (
            <div className="w-full max-w-sm">
              <img
                src={preview}
                alt="Preview"
                className="rounded-lg w-full h-auto"
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 w-full max-w-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />

          <Button
            size="lg"
            onClick={handleClick}
            disabled={isUploading}
            className="min-w-[200px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Choose Image
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
