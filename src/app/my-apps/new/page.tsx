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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"

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

const REQUIREMENTS_TEMPLATE = `Example requirements:
• User authentication (login/signup)
• Dashboard with data visualization
• Mobile responsive design
• Dark mode support
• Export data to CSV/PDF
• Real-time notifications`

function CharacterCounter({
  current,
  max,
  min
}: {
  current: number
  max: number
  min?: number
}) {
  const isOverMax = current > max
  const isUnderMin = min !== undefined && current > 0 && current < min
  const isValid = current >= (min || 0) && current <= max && current > 0

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`${
          isOverMax || isUnderMin
            ? "text-destructive font-medium"
            : isValid
            ? "text-muted-foreground"
            : "text-muted-foreground"
        }`}
        data-testid="char-counter"
      >
        {current} / {max} characters
      </span>
      {min !== undefined && current > 0 && current < min && (
        <span className="text-destructive text-xs" data-testid="char-counter-warning">
          (minimum {min})
        </span>
      )}
    </div>
  )
}

function FieldStatusIcon({
  error,
  value,
  isDirty
}: {
  error?: string
  value: string
  isDirty?: boolean
}) {
  if (error) {
    return <XCircle className="h-4 w-4 text-destructive" data-testid="error-icon" />
  }

  if (value && isDirty) {
    return <CheckCircle2 className="h-4 w-4 text-green-600" data-testid="success-icon" />
  }

  return null
}

export default function NewAppPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    requirements: "",
    monetizationModel: "" as typeof MONETIZATION_MODELS[number] | "",
  })

  const form = useForm<AppCreationFormData>({
    resolver: zodResolver(appCreationSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldUnregister: false,
    defaultValues: {
      name: "",
      description: "",
      requirements: "",
      monetizationModel: "" as typeof MONETIZATION_MODELS[number],
    },
  })

  useEffect(() => {
    setIsClient(true)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const data = JSON.parse(saved)
          setFormState(data)
          form.reset(data)
        } catch (error) {
          console.error("Failed to load draft:", error)
        }
      }
    }
  }, [form])

  useEffect(() => {
    if (!isClient) return
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formState))
    }
  }, [formState, isClient])

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
      /* v8 ignore next 3 */
      case 3:
        isValid = true
        break
      /* v8 ignore next 2 */
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

  const onSubmit = async () => {
    try {
      const response = await fetch("/api/apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("Failed to create app:", error)
        return
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY)
      }

      router.push("/my-apps")
    } catch (error) {
      console.error("Error creating app:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep === STEPS.length - 1) {
      onSubmit()
    } else {
      handleNext()
    }
  }

  const progressValue = ((currentStep + 1) / STEPS.length) * 100

  const getFormErrors = () => {
    const errors = form.formState.errors
    const errorList: Array<{ field: string; message: string }> = []

    if (errors.name?.message) {
      errorList.push({ field: "App Name", message: errors.name.message })
    }
    if (errors.description?.message) {
      errorList.push({ field: "Description", message: errors.description.message })
    }
    if (errors.requirements?.message) {
      errorList.push({ field: "Requirements", message: errors.requirements.message })
    }
    if (errors.monetizationModel?.message) {
      errorList.push({ field: "Monetization Model", message: errors.monetizationModel.message })
    }

    return errorList
  }

  const formErrors = getFormErrors()

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>App Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="My Awesome App"
                        {...field}
                        value={formState.name}
                        onChange={(e) => {
                          const value = e.target.value
                          setFormState({ ...formState, name: value })
                          field.onChange(value)
                        }}
                        data-testid="app-name-input"
                        className={fieldState.error ? "pr-10" : ""}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <FieldStatusIcon
                          error={fieldState.error?.message}
                          value={formState.name}
                          isDirty={fieldState.isDirty}
                        />
                      </div>
                    </div>
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormDescription>
                      Choose a unique name for your application
                    </FormDescription>
                    <CharacterCounter current={formState.name.length} max={50} min={3} />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Textarea
                        placeholder="Describe what your app does..."
                        className="min-h-[100px]"
                        {...field}
                        value={formState.description}
                        onChange={(e) => {
                          const value = e.target.value
                          setFormState({ ...formState, description: value })
                          field.onChange(value)
                        }}
                        data-testid="app-description-textarea"
                      />
                      <div className="absolute right-3 top-3">
                        <FieldStatusIcon
                          error={fieldState.error?.message}
                          value={formState.description}
                          isDirty={fieldState.isDirty}
                        />
                      </div>
                    </div>
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormDescription>
                      Provide a brief description of your application
                    </FormDescription>
                    <CharacterCounter current={formState.description.length} max={500} min={10} />
                  </div>
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
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Initial Requirements</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Textarea
                      placeholder={REQUIREMENTS_TEMPLATE}
                      className="min-h-[200px] font-mono text-sm"
                      {...field}
                      value={formState.requirements}
                      onChange={(e) => {
                        const value = e.target.value
                        setFormState({ ...formState, requirements: value })
                        field.onChange(value)
                      }}
                      data-testid="requirements-textarea"
                    />
                    <div className="absolute right-3 top-3">
                      <FieldStatusIcon
                        error={fieldState.error?.message}
                        value={formState.requirements}
                        isDirty={fieldState.isDirty}
                      />
                    </div>
                  </div>
                </FormControl>
                <div className="flex justify-between items-start gap-4">
                  <FormDescription className="flex-1">
                    Describe the features and functionality you want in your app. Use bullet points (•) for clarity.
                  </FormDescription>
                  <CharacterCounter current={formState.requirements.length} max={2000} min={20} />
                </div>
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
                <Select
                  onValueChange={(value) => {
                    setFormState({ ...formState, monetizationModel: value as typeof MONETIZATION_MODELS[number] })
                    field.onChange(value)
                  }}
                  value={formState.monetizationModel}
                >
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
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">App Name</h3>
              <p className="text-muted-foreground" data-testid="review-name">
                {formState.name}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground" data-testid="review-description">
                {formState.description}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Requirements</h3>
              <p className="text-muted-foreground whitespace-pre-wrap" data-testid="review-requirements">
                {formState.requirements}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Monetization Model</h3>
              <p className="text-muted-foreground" data-testid="review-monetization">
                {formState.monetizationModel ? MONETIZATION_LABELS[formState.monetizationModel] : ""}
              </p>
            </div>
          </div>
        )

      /* v8 ignore next 2 */
      default:
        return null
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New App</CardTitle>
          <CardDescription data-testid="wizard-step-title">
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]?.title}
          </CardDescription>
          <div className="pt-2">
            <Progress value={progressValue} data-testid="wizard-progress" />
            <p className="text-xs text-muted-foreground mt-1" data-testid="wizard-progress-text">
              Step {currentStep + 1} of {STEPS.length}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {formErrors.length > 0 && (
                <Alert variant="destructive" data-testid="error-summary">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {formErrors.map((error, index) => (
                        <li key={index} data-testid={`error-item-${index}`}>
                          <strong>{error.field}:</strong> {error.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-4">{renderStep()}</div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  data-testid="wizard-back-button"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  data-testid={currentStep === STEPS.length - 1 ? "wizard-submit-button" : "wizard-next-button"}
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
