"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ExportButtonProps {
  imageUrl: string
  fileName: string
}

export function ExportButton({ imageUrl, fileName }: ExportButtonProps) {
  const handleExport = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to download image:", error)
      alert("Failed to download image. Please try again.")
    }
  }

  return (
    <Button onClick={handleExport} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      Download Enhanced
    </Button>
  )
}
