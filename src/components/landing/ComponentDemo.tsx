"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react"

export function ComponentDemo() {
  const [progress, setProgress] = useState(65)
  const [switchValue, setSwitchValue] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleProgressDemo = () => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleLoadingDemo = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }

  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center mb-12">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Built with Modern UI
          </h2>
          <p className="text-lg text-muted-foreground">
            Crafted with shadcn/ui and Tailwind CSS for a polished, accessible experience
          </p>
        </div>

        <div className="mx-auto max-w-6xl">
          <Tabs defaultValue="buttons" className="w-full">
            <TabsList className="mx-auto mb-8 flex w-fit flex-wrap">
              <TabsTrigger value="buttons">Buttons</TabsTrigger>
              <TabsTrigger value="inputs">Inputs</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="dialog">Dialog</TabsTrigger>
            </TabsList>

            <TabsContent value="buttons">
              <Card>
                <CardHeader>
                  <CardTitle>Button Variants</CardTitle>
                  <CardDescription>
                    Different button styles for various actions and contexts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap gap-4">
                    <Button>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                    <Button variant="destructive">Destructive</Button>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button disabled>Disabled</Button>
                    <Button onClick={handleLoadingDemo} disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isLoading ? "Loading..." : "Click Me"}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inputs">
              <Card>
                <CardHeader>
                  <CardTitle>Form Controls</CardTitle>
                  <CardDescription>
                    Input fields, selects, and toggles with consistent styling
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="demo-input">Text Input</Label>
                      <Input id="demo-input" placeholder="Enter your email" type="email" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="demo-select">Select</Label>
                      <Select>
                        <SelectTrigger id="demo-select">
                          <SelectValue placeholder="Choose resolution" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1k">1K Resolution</SelectItem>
                          <SelectItem value="2k">2K Resolution</SelectItem>
                          <SelectItem value="4k">4K Resolution</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Switch
                      id="demo-switch"
                      checked={switchValue}
                      onCheckedChange={setSwitchValue}
                    />
                    <Label htmlFor="demo-switch">
                      {switchValue ? "Enabled" : "Disabled"}
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Disabled Input</Label>
                    <Input disabled placeholder="This input is disabled" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="feedback">
              <Card>
                <CardHeader>
                  <CardTitle>Feedback Components</CardTitle>
                  <CardDescription>
                    Progress indicators, alerts, and loading states
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    <Button size="sm" variant="outline" onClick={handleProgressDemo}>
                      Animate Progress
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Information</AlertTitle>
                      <AlertDescription>
                        This is an informational alert message.
                      </AlertDescription>
                    </Alert>

                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        Something went wrong. Please try again.
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Loading Skeleton</p>
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dialog">
              <Card>
                <CardHeader>
                  <CardTitle>Dialog / Modal</CardTitle>
                  <CardDescription>
                    Modal dialogs with proper overlay and animations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Click the button below to test the dialog overlay transparency.
                    The overlay should be semi-transparent (80% black).
                  </p>

                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>Open Dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Dialog Example</DialogTitle>
                        <DialogDescription>
                          This dialog tests the overlay transparency.
                          The background should be darkened with 80% opacity.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                          If you can clearly see the content behind this dialog,
                          the overlay transparency might not be working correctly.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={() => setDialogOpen(false)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Confirm
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  )
}
