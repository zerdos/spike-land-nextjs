'use client'

import Link from 'next/link'
import { App, Requirement, MonetizationModel, EnhancedImage, ImageEnhancementJob } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImageUpload } from '@/components/enhance/ImageUpload'
import { EnhancedImagesList } from '@/components/enhance/EnhancedImagesList'
import { TokenBalanceDisplay } from '@/components/enhance/TokenBalanceDisplay'

interface MyAppsClientProps {
  apps: (App & {
    requirements: Requirement[]
    monetizationModels: MonetizationModel[]
  })[]
  enhancedImages: (EnhancedImage & {
    enhancementJobs: ImageEnhancementJob[]
  })[]
}

export function MyAppsClient({ apps, enhancedImages }: MyAppsClientProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              My Apps
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage your applications and enhanced images
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/my-apps/new">
              <Button size="lg" className="w-full sm:w-auto">
                Create New App
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="apps" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="apps">
              Apps ({apps.length})
            </TabsTrigger>
            <TabsTrigger value="images">
              Enhanced Images ({enhancedImages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apps" className="space-y-6">
            {apps.length === 0 ? (
              <>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <input
                      type="search"
                      placeholder="Search apps..."
                      className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      disabled
                      aria-label="Search apps"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="cursor-not-allowed opacity-50">
                      All
                    </Badge>
                    <Badge variant="outline" className="cursor-not-allowed opacity-50">
                      Active
                    </Badge>
                    <Badge variant="outline" className="cursor-not-allowed opacity-50">
                      Draft
                    </Badge>
                  </div>
                </div>

                <Card className="border-dashed">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">No apps yet</CardTitle>
                    <CardDescription className="mt-2">
                      Get started by creating your first vibe-coded application
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4 pb-8">
                    <div className="grid gap-2 text-center text-sm text-muted-foreground">
                      <p>
                        Click &ldquo;Create New App&rdquo; to start building with AI-powered development
                      </p>
                    </div>
                    <Link href="/my-apps/new">
                      <Button size="lg" variant="default">
                        Create Your First App
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <input
                      type="search"
                      placeholder="Search apps..."
                      className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      disabled
                      aria-label="Search apps"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="cursor-not-allowed opacity-50">
                      All ({apps.length})
                    </Badge>
                    <Badge variant="outline" className="cursor-not-allowed opacity-50">
                      Active ({apps.filter((app) => app.status === 'ACTIVE').length})
                    </Badge>
                    <Badge variant="outline" className="cursor-not-allowed opacity-50">
                      Draft ({apps.filter((app) => app.status === 'DRAFT').length})
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {apps.map((app) => (
                    <Card key={app.id} className="flex flex-col">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-xl">{app.name}</CardTitle>
                          <Badge variant={app.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {app.status}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {app.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-semibold">Requirements:</span>{' '}
                            {app.requirements.length}
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold">Monetization:</span>{' '}
                            {app.monetizationModels[0]?.type || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created {new Date(app.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        <Button variant="outline" className="flex-1" size="sm">
                          View
                        </Button>
                        <Button variant="default" className="flex-1" size="sm">
                          Edit
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="images" className="space-y-6">
            <div className="flex justify-end mb-4">
              <TokenBalanceDisplay />
            </div>

            <ImageUpload />

            {enhancedImages.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Your Enhanced Images</h2>
                <EnhancedImagesList images={enhancedImages} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
