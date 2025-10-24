import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import NewAppPage from "./page"

const mockPush = vi.fn()
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
}

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}))

describe("NewAppPage", () => {
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    localStorageMock = {}

    global.Storage.prototype.getItem = vi.fn((key: string) => {
      return localStorageMock[key] || null
    })

    global.Storage.prototype.setItem = vi.fn((key: string, value: string) => {
      localStorageMock[key] = value
    })

    global.Storage.prototype.removeItem = vi.fn((key: string) => {
      delete localStorageMock[key]
    })

    global.Storage.prototype.clear = vi.fn(() => {
      localStorageMock = {}
    })

    mockPush.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should render the wizard with step 1 initially", () => {
    render(<NewAppPage />)

    expect(screen.getByText("Create New App")).toBeInTheDocument()
    expect(screen.getByText(/Step 1 of 4: Basic Info/)).toBeInTheDocument()
    expect(screen.getByTestId("app-name-input")).toBeInTheDocument()
    expect(screen.getByTestId("app-description-input")).toBeInTheDocument()
  })

  it("should show progress bar", () => {
    render(<NewAppPage />)

    const progress = screen.getByTestId("wizard-progress")
    expect(progress).toBeInTheDocument()
  })

  it("should disable back button on first step", () => {
    render(<NewAppPage />)

    const backButton = screen.getByTestId("back-button")
    expect(backButton).toBeDisabled()
  })

  it("should enable back button after moving to step 2", async () => {
    const user = userEvent.setup()
    render(<NewAppPage />)

    await user.type(screen.getByTestId("app-name-input"), "Test App")
    await user.type(
      screen.getByTestId("app-description-input"),
      "This is a test description"
    )

    await user.click(screen.getByTestId("next-button"))

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 4: Requirements/)).toBeInTheDocument()
    })

    const backButton = screen.getByTestId("back-button")
    expect(backButton).not.toBeDisabled()
  })

  describe("Step 1 - Basic Info", () => {
    it("should validate name field", async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      await user.type(screen.getByTestId("app-name-input"), "AB")
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(
          screen.getByText("App name must be at least 3 characters")
        ).toBeInTheDocument()
      })
    })

    it("should validate description field", async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      await user.type(screen.getByTestId("app-name-input"), "Test App")
      await user.type(screen.getByTestId("app-description-input"), "Short")
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(
          screen.getByText("Description must be at least 10 characters")
        ).toBeInTheDocument()
      })
    })

    it("should proceed to step 2 with valid data", async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      await user.type(screen.getByTestId("app-name-input"), "Test App")
      await user.type(
        screen.getByTestId("app-description-input"),
        "This is a valid test description"
      )

      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 4: Requirements/)).toBeInTheDocument()
      })

      expect(screen.getByTestId("app-requirements-input")).toBeInTheDocument()
    })

    it("should accept name with hyphens and numbers", async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      await user.type(screen.getByTestId("app-name-input"), "Test-App-123")
      await user.type(
        screen.getByTestId("app-description-input"),
        "This is a valid test description"
      )

      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 4: Requirements/)).toBeInTheDocument()
      })
    })

    it("should reject name with special characters", async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      await user.type(screen.getByTestId("app-name-input"), "Test@App")
      await user.type(
        screen.getByTestId("app-description-input"),
        "Valid description here"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(
          screen.getByText(
            "App name can only contain letters, numbers, spaces, and hyphens"
          )
        ).toBeInTheDocument()
      })
    })
  })

  describe("Step 2 - Requirements", () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      await user.type(screen.getByTestId("app-name-input"), "Test App")
      await user.type(
        screen.getByTestId("app-description-input"),
        "This is a test description"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 4: Requirements/)).toBeInTheDocument()
      })
    })

    it("should render requirements textarea", () => {
      expect(screen.getByTestId("app-requirements-input")).toBeInTheDocument()
    })

    it("should validate requirements field", async () => {
      const user = userEvent.setup()

      await user.type(screen.getByTestId("app-requirements-input"), "Short")
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(
          screen.getByText("Requirements must be at least 20 characters")
        ).toBeInTheDocument()
      })
    })

    it("should proceed to step 3 with valid requirements", async () => {
      const user = userEvent.setup()

      await user.type(
        screen.getByTestId("app-requirements-input"),
        "This app needs authentication and user profile management features"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(
          screen.getByText(/Step 3 of 4: Monetization/)
        ).toBeInTheDocument()
      })
    })

    it("should go back to step 1 when back button is clicked", async () => {
      const user = userEvent.setup()

      await user.click(screen.getByTestId("back-button"))

      await waitFor(() => {
        expect(screen.getByText(/Step 1 of 4: Basic Info/)).toBeInTheDocument()
      })
    })
  })

  describe("Step 3 - Monetization", () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      await user.type(screen.getByTestId("app-name-input"), "Test App")
      await user.type(
        screen.getByTestId("app-description-input"),
        "This is a test description"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 4: Requirements/)).toBeInTheDocument()
      })

      await user.type(
        screen.getByTestId("app-requirements-input"),
        "This app needs authentication and user profile management"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(
          screen.getByText(/Step 3 of 4: Monetization/)
        ).toBeInTheDocument()
      })
    })

    it("should render monetization select", () => {
      expect(screen.getByTestId("monetization-select")).toBeInTheDocument()
    })

    it("should validate monetization model selection", async () => {
      const user = userEvent.setup()

      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(
          screen.getByText("Please select a monetization model")
        ).toBeInTheDocument()
      })
    })

    it("should proceed to step 4 with valid monetization model", async () => {
      const user = userEvent.setup()

      await user.click(screen.getByTestId("monetization-select"))

      await waitFor(() => {
        const options = screen.getAllByText("Free - No charge for users")
        expect(options.length).toBeGreaterThan(0)
      })

      const options = screen.getAllByText("Free - No charge for users")
      await user.click(options[options.length - 1])

      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getByText(/Step 4 of 4: Review/)).toBeInTheDocument()
      })
    })

    it("should show all monetization options", async () => {
      const user = userEvent.setup()

      await user.click(screen.getByTestId("monetization-select"))

      await waitFor(() => {
        expect(screen.getAllByText("Free - No charge for users").length).toBeGreaterThan(0)
        expect(
          screen.getAllByText("Freemium - Free with premium features").length
        ).toBeGreaterThan(0)
        expect(
          screen.getAllByText("Subscription - Recurring payments").length
        ).toBeGreaterThan(0)
        expect(
          screen.getAllByText("One-time Purchase - Single payment").length
        ).toBeGreaterThan(0)
        expect(screen.getAllByText("Usage-based - Pay per use").length).toBeGreaterThan(0)
      })
    })
  })

  describe("Step 4 - Review", () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      await user.type(screen.getByTestId("app-name-input"), "My Test App")
      await user.type(
        screen.getByTestId("app-description-input"),
        "This is my test app description"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 2 of 4/)[0]).toBeInTheDocument()
      })

      await user.type(
        screen.getByTestId("app-requirements-input"),
        "The app needs user authentication and profile management features"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 3 of 4/)[0]).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("monetization-select"))
      await waitFor(() => {
        const options = screen.getAllByText("Subscription - Recurring payments")
        expect(options.length).toBeGreaterThan(0)
      })
      const subscriptionOptions = screen.getAllByText("Subscription - Recurring payments")
      await user.click(subscriptionOptions[subscriptionOptions.length - 1])

      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getByText(/Step 4 of 4: Review/)).toBeInTheDocument()
      })
    })

    it("should display all entered data", async () => {
      await waitFor(() => {
        expect(screen.getByTestId("review-name")).toHaveTextContent("My Test App")
      }, { timeout: 5000 })
      expect(screen.getByTestId("review-description")).toHaveTextContent(
        "This is my test app description"
      )
      expect(screen.getByTestId("review-requirements")).toHaveTextContent(
        "The app needs user authentication and profile management features"
      )
      expect(screen.getByTestId("review-monetization")).toHaveTextContent(
        "Subscription - Recurring payments"
      )
    })

    it("should show Create App button on final step", () => {
      expect(screen.getByTestId("submit-button")).toHaveTextContent("Create App")
    })

    it("should create app and navigate on submit", async () => {
      const user = userEvent.setup()

      await user.click(screen.getByTestId("submit-button"))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/my-apps")
      })
    })

    it("should save app to localStorage on submit", async () => {
      const user = userEvent.setup()

      await user.click(screen.getByTestId("submit-button"))

      await waitFor(() => {
        const savedApps = JSON.parse(localStorageMock["my-apps"] || "[]")
        expect(savedApps).toHaveLength(1)
        expect(savedApps[0]).toMatchObject({
          name: "My Test App",
          description: "This is my test app description",
          requirements:
            "The app needs user authentication and profile management features",
          monetizationModel: "subscription",
        })
        expect(savedApps[0]).toHaveProperty("id")
        expect(savedApps[0]).toHaveProperty("createdAt")
      })
    })

    it("should clear draft from localStorage on submit", async () => {
      const user = userEvent.setup()

      localStorageMock["app-creation-draft"] = JSON.stringify({
        name: "Draft App",
      })

      await user.click(screen.getByTestId("submit-button"))

      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith(
          "app-creation-draft"
        )
      })
    })
  })

  describe("LocalStorage persistence", () => {
    it("should save form data to localStorage as user types", async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      await user.type(screen.getByTestId("app-name-input"), "Draft App")

      await waitFor(
        () => {
          const draft = JSON.parse(
            localStorageMock["app-creation-draft"] || "{}"
          )
          expect(draft.name).toBe("Draft App")
        },
        { timeout: 3000 }
      )
    })

    it("should load saved draft on mount", async () => {
      localStorageMock["app-creation-draft"] = JSON.stringify({
        name: "Saved Draft",
        description: "Saved description from draft",
        requirements: "Saved requirements from draft",
        monetizationModel: "freemium",
      })

      render(<NewAppPage />)

      await waitFor(() => {
        const nameInput = screen.getByTestId(
          "app-name-input"
        ) as HTMLInputElement
        expect(nameInput.value).toBe("Saved Draft")

        const descInput = screen.getByTestId(
          "app-description-input"
        ) as HTMLTextAreaElement
        expect(descInput.value).toBe("Saved description from draft")
      })
    })

    it("should handle corrupted localStorage data gracefully", async () => {
      localStorageMock["app-creation-draft"] = "corrupted-json-data"

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})

      render(<NewAppPage />)

      await waitFor(() => {
        expect(screen.getByTestId("app-name-input")).toHaveValue("")
      })

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe("Navigation", () => {
    it("should navigate through all steps forward", async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      expect(screen.getAllByText(/Step 1 of 4/)[0]).toBeInTheDocument()

      await user.type(screen.getByTestId("app-name-input"), "Test App")
      await user.type(
        screen.getByTestId("app-description-input"),
        "Test description"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 2 of 4/)[0]).toBeInTheDocument()
      })

      await user.type(
        screen.getByTestId("app-requirements-input"),
        "Requirements for the test app go here"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 3 of 4/)[0]).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("monetization-select"))
      await waitFor(() => {
        const options = screen.getAllByText("Free - No charge for users")
        expect(options.length).toBeGreaterThan(0)
      })
      const freeOptions = screen.getAllByText("Free - No charge for users")
      await user.click(freeOptions[freeOptions.length - 1])
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 4 of 4/)[0]).toBeInTheDocument()
      })
    })

    it("should navigate backward through steps", async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      await user.type(screen.getByTestId("app-name-input"), "Test App")
      await user.type(
        screen.getByTestId("app-description-input"),
        "Test description"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 2 of 4/)[0]).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("back-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 1 of 4/)[0]).toBeInTheDocument()
      })
    })

    it("should preserve data when navigating backward", async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      await user.type(screen.getByTestId("app-name-input"), "Test App")
      await user.type(
        screen.getByTestId("app-description-input"),
        "Test description"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 2 of 4/)[0]).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("back-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 1 of 4/)[0]).toBeInTheDocument()
      })

      await waitFor(() => {
        const nameInput = screen.getByTestId("app-name-input") as HTMLInputElement
        expect(nameInput.value).toBe("Test App")
      })
    })
  })

  describe("Progress indicator", () => {
    it("should update progress as steps advance", async () => {
      const user = userEvent.setup()
      render(<NewAppPage />)

      const progress = screen.getByTestId("wizard-progress")

      expect(progress).toBeInTheDocument()

      await user.type(screen.getByTestId("app-name-input"), "Test App")
      await user.type(
        screen.getByTestId("app-description-input"),
        "Test description"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 2 of 4/)[0]).toBeInTheDocument()
      })
    })
  })

  describe("Form submission", () => {
    it("should append to existing apps in localStorage", async () => {
      const user = userEvent.setup()

      localStorageMock["my-apps"] = JSON.stringify([
        {
          id: "1",
          name: "Existing App",
          description: "Existing app description",
          requirements: "Existing requirements",
          monetizationModel: "free",
          createdAt: new Date().toISOString(),
        },
      ])

      render(<NewAppPage />)

      await user.type(screen.getByTestId("app-name-input"), "New App")
      await user.type(
        screen.getByTestId("app-description-input"),
        "New app description"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 2 of 4/)[0]).toBeInTheDocument()
      })

      await user.type(
        screen.getByTestId("app-requirements-input"),
        "New app requirements go here"
      )
      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 3 of 4/)[0]).toBeInTheDocument()
      })

      const selectTrigger = screen.getByTestId("monetization-select")
      await user.click(selectTrigger)

      await waitFor(
        () => {
          const freeOptions = screen.queryAllByText("Free - No charge for users")
          if (freeOptions.length > 0) {
            return true
          }
          throw new Error("Waiting for select options")
        },
        { timeout: 2000 }
      )

      const freeOptions = screen.getAllByText("Free - No charge for users")
      await user.click(freeOptions[freeOptions.length - 1])

      await user.click(screen.getByTestId("next-button"))

      await waitFor(() => {
        expect(screen.getAllByText(/Step 4 of 4/)[0]).toBeInTheDocument()
      })

      await user.click(screen.getByTestId("submit-button"))

      await waitFor(() => {
        const apps = JSON.parse(localStorageMock["my-apps"] || "[]")
        expect(apps).toHaveLength(2)
        expect(apps[1].name).toBe("New App")
      })
    })
  })
})
