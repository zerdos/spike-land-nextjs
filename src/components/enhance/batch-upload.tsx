"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, X, CheckCircle, AlertCircle, Loader2, Image as ImageIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

const MAX_BATCH_SIZE = 20
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface FileUploadStatus {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
  imageId?: string
  url?: string
  thumbnail?: string
}

interface BatchUploadProps {
  onUploadComplete?: (imageIds: string[]) => void
}

export function BatchUpload({ onUploadComplete }: BatchUploadProps) {
  const [files, setFiles] = useState<FileUploadStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File too large. Maximum size is 10MB.' }
    }
    return { valid: true }
  }

  const createThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        resolve(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    })
  }

  const handleFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)

    // Check batch size limit
    if (files.length + fileArray.length > MAX_BATCH_SIZE) {
      alert(`Maximum ${MAX_BATCH_SIZE} files allowed per batch`)
      return
    }

    // Validate and create file status objects
    const validatedFiles: FileUploadStatus[] = []

    for (const file of fileArray) {
      const validation = validateFile(file)
      const thumbnail = await createThumbnail(file)

      validatedFiles.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: validation.valid ? 'pending' : 'error',
        progress: 0,
        error: validation.error,
        thumbnail,
      })
    }

    setFiles((prev) => [...prev, ...validatedFiles])
  }, [files.length])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles)
    }
  }, [handleFiles])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }, [])

  const uploadBatch = useCallback(async () => {
    const filesToUpload = files.filter((f) => f.status === 'pending')

    if (filesToUpload.length === 0) {
      return
    }

    setIsUploading(true)

    try {
      // Create FormData with all files
      const formData = new FormData()
      filesToUpload.forEach((fileStatus) => {
        formData.append('files', fileStatus.file)
      })

      // Mark all as uploading
      setFiles((prev) =>
        prev.map((f) =>
          filesToUpload.some((upload) => upload.id === f.id)
            ? { ...f, status: 'uploading' as const, progress: 10 }
            : f
        )
      )

      const response = await fetch('/api/images/batch-upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await response.json()

      // Update file statuses with results
      setFiles((prev) =>
        prev.map((f) => {
          const result = data.results?.find(
            (r: { filename: string }) => r.filename === f.file.name
          )

          if (result) {
            if (result.success) {
              return {
                ...f,
                status: 'completed' as const,
                progress: 100,
                imageId: result.imageId,
                url: result.url,
              }
            } else {
              return {
                ...f,
                status: 'error' as const,
                error: result.error || 'Upload failed',
              }
            }
          }

          return f
        })
      )

      // Call onUploadComplete with successful image IDs
      const successfulImageIds = data.results
        ?.filter((r: { success: boolean }) => r.success)
        .map((r: { imageId: string }) => r.imageId) || []

      if (successfulImageIds.length > 0 && onUploadComplete) {
        onUploadComplete(successfulImageIds)
      }
    } catch (error) {
      // Mark all uploading files as error
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
            : f
        )
      )
    } finally {
      setIsUploading(false)
    }
  }, [files, onUploadComplete])

  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== 'completed'))
  }, [])

  const clearAll = useCallback(() => {
    setFiles([])
  }, [])

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const completedCount = files.filter((f) => f.status === 'completed').length
  const errorCount = files.filter((f) => f.status === 'error').length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Upload</CardTitle>
        <CardDescription>
          Upload up to {MAX_BATCH_SIZE} images at once. Each file must be under 10MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${files.length >= MAX_BATCH_SIZE ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={() => files.length < MAX_BATCH_SIZE && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {isDragging ? 'Drop files here' : 'Drag and drop files here'}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse ({files.length}/{MAX_BATCH_SIZE} files)
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={files.length >= MAX_BATCH_SIZE}
          />
        </div>

        {/* Summary */}
        {files.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </Badge>
            {pendingCount > 0 && (
              <Badge variant="outline">
                {pendingCount} pending
              </Badge>
            )}
            {completedCount > 0 && (
              <Badge variant="default" className="bg-green-500">
                {completedCount} completed
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="destructive">
                {errorCount} failed
              </Badge>
            )}
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map((fileStatus) => (
              <div
                key={fileStatus.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                {/* Thumbnail */}
                <div className="relative w-12 h-12 flex-shrink-0 bg-muted rounded overflow-hidden">
                  {fileStatus.thumbnail ? (
                    <img
                      src={fileStatus.thumbnail}
                      alt={fileStatus.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileStatus.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {fileStatus.status === 'uploading' && (
                    <Progress value={fileStatus.progress} className="mt-1 h-1" />
                  )}
                  {fileStatus.error && (
                    <p className="text-xs text-destructive mt-1">{fileStatus.error}</p>
                  )}
                </div>

                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {fileStatus.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(fileStatus.id)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {fileStatus.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {fileStatus.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {fileStatus.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {files.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={uploadBatch}
              disabled={isUploading || pendingCount === 0}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
            {completedCount > 0 && (
              <Button variant="outline" onClick={clearCompleted} disabled={isUploading}>
                Clear Completed
              </Button>
            )}
            <Button variant="outline" onClick={clearAll} disabled={isUploading}>
              Clear All
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
