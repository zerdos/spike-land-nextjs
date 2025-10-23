"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  appCreationSchema,
  MONETIZATION_MODELS,
  type AppCreationFormData,
} from "@/lib/validations/app"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

const STORAGE_KEY = "app-creation-draft"

const STEPS = [
  { title: "Basic Info", description: "Name and description" },
  { title: "Requirements", description: "Initial requirements" },
  { title: "Monetization", description: "Choose your model" },
  { title: "Review", description: "Confirm details" },
] as const

const MONETIZATION_LABELS: Record<typeof MONETIZATION_MODELS[number], string> = {
  free: "Free - No charge for users",
  freemium: "Freemium - Free with premium features",
  subscription: "Subscription - Recurring payments",
  "one-time": "One-time Purchase - Single payment",
  "usage-based": "Usage-based - Pay per use",
}

export default function NewAppPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isClient, setIsClient] = useState(false)

  const form = useForm<AppCreationFormData>({
    resolver: zodResolver(appCreationSchema),
    defaultValues: {
      name: "",
      description: "",
      requirements: "",
      monetizationModel: undefined,
    },
  })

  useEffect(() => {
    setIsClient(true)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const data = JSON.parse(saved)
          form.reset(data)
        } catch (error) {
          console.error("Failed to load draft:", error)
        }
      }
    }
  }, [form])

  useEffect(() => {
    if (!isClient) return

    const subscription = form.watch((value) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      }
    })
    return () => subscription.unsubscribe()
  }, [form, isClient])

  const validateCurrentStep = async () => {
    let isValid = false

    switch (currentStep) {
      case 0:
        isValid = await form.trigger(["name", "description"])
        break
      case 1:
        isValid = await form.trigger(["requirements"])
        break
      case 2:
        isValid = await form.trigger(["monetizationModel"])
        break
      case 3:
        isValid = true
        break
      default:
        isValid = false
    }

    return isValid
  }

  const handleNext = async () => {
    const isValid = await validateCurrentStep()
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = (data: AppCreationFormData) => {
    if (typeof window !== "undefined") {
      const existingApps = localStorage.getItem("my-apps")
      const apps = existingApps ? JSON.parse(existingApps) : []

      apps.push({
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      })

      localStorage.setItem("my-apps", JSON.stringify(apps))
      localStorage.removeItem(STORAGE_KEY)
    }

    router.push("/my-apps")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep === STEPS.length - 1) {
      const isValid = await form.trigger()
      if (isValid) {
        form.handleSubmit(onSubmit)()
      }
    } else {
      handleNext()
    }
  }

  const progressValue = ((currentStep + 1) / STEPS.length) * 100

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>App Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Awesome App"
                      {...field}
                      data-testid="app-name-input"
                    />
                  </FormControl>
                  <FormDescription>
                    Choose a unique name for your application
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what your app does..."
                      className="min-h-[100px]"
                      {...field}
                      data-testid="app-description-input"
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a brief description of your application
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )

      case 1:
        return (
          <FormField
            control={form.control}
            name="requirements"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Requirements</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="List your app requirements, features, and functionality..."
                    className="min-h-[200px]"
                    {...field}
                    data-testid="app-requirements-input"
                  />
                </FormControl>
                <FormDescription>
                  Describe the features and functionality you want in your app
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 2:
        return (
          <FormField
            control={form.control}
            name="monetizationModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monetization Model</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="monetization-select">
                      <SelectValue placeholder="Select a monetization model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MONETIZATION_MODELS.map((model) => (
                      <SelectItem key={model} value={model}>
                        {MONETIZATION_LABELS[model]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose how you plan to monetize your application
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 3:
        const values = form.getValues()
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">App Name</h3>
              <p className="text-muted-foreground" data-testid="review-name">
                {values.name}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground" data-testid="review-description">
                {values.description}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Requirements</h3>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="review-requirements">
                {values.requirements}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Monetization Model</h3>
              <p className="text-muted-foreground" data-testid="review-monetization">
                {values.monetizationModel ? MONETIZATION_LABELS[values.monetizationModel] : ""}
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New App</CardTitle>
          <CardDescription>
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]?.title}
          </CardDescription>
          <div className="pt-2">
            <Progress value={progressValue} data-testid="wizard-progress" />
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">{renderStep()}</div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  data-testid="back-button"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  data-testid={currentStep === STEPS.length - 1 ? "submit-button" : "next-button"}
                >
                  {currentStep === STEPS.length - 1 ? "Create App" : "Next"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
