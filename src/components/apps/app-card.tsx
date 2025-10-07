"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AppCardProps {
  icon?: React.ReactNode
  name: string
  description: string
  appUrl?: string
  detailsUrl?: string
  onLaunch?: () => void
  onViewDetails?: () => void
  className?: string
}

export function AppCard({
  icon,
  name,
  description,
  appUrl,
  detailsUrl,
  onLaunch,
  onViewDetails,
  className
}: AppCardProps) {
  const handleLaunch = () => {
    if (onLaunch) {
      onLaunch()
    } else if (appUrl) {
      window.open(appUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails()
    } else if (detailsUrl) {
      window.location.href = detailsUrl
    }
  }

  return (
    <Card className={cn("flex flex-col h-full hover:shadow-lg transition-shadow", className)}>
      <CardHeader>
        {icon && (
          <div className="w-12 h-12 mb-3 flex items-center justify-center">
            {icon}
          </div>
        )}
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow" />
      <CardFooter className="flex gap-2">
        <Button
          onClick={handleLaunch}
          className="flex-1"
          variant="default"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Launch App
        </Button>
        <Button
          onClick={handleViewDetails}
          className="flex-1"
          variant="outline"
        >
          <Info className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  )
}