import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewAppPage from "./page";

const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

describe("NewAppPage", () => {
  let localStorageMock: { [key: string]: string; };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorageMock = {};

    global.Storage.prototype.getItem = vi.fn((key: string) => {
      return localStorageMock[key] || null;
    });

    global.Storage.prototype.setItem = vi.fn((key: string, value: string) => {
      localStorageMock[key] = value;
    });

    global.Storage.prototype.removeItem = vi.fn((key: string) => {
      delete localStorageMock[key];
    });

    global.Storage.prototype.clear = vi.fn(() => {
      localStorageMock = {};
    });

    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: "new-app-id", name: "New App" }),
      } as Response)
    );
    global.fetch = fetchMock;

    mockPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render the wizard with step 1 initially", () => {
    render(<NewAppPage />);

    expect(screen.getByText("Create New App")).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 4: Basic Info/)).toBeInTheDocument();
    expect(screen.getByTestId("app-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("app-description-textarea")).toBeInTheDocument();
  });

  it("should show progress bar", () => {
    render(<NewAppPage />);

    const progress = screen.getByTestId("wizard-progress");
    expect(progress).toBeInTheDocument();
  });

  it("should disable back button on first step", () => {
    render(<NewAppPage />);

    const backButton = screen.getByTestId("wizard-back-button");
    expect(backButton).toBeDisabled();
  });

  it("should enable back button after moving to step 2", async () => {
    const user = userEvent.setup();
    render(<NewAppPage />);

    await user.type(screen.getByTestId("app-name-input"), "Test App");
    await user.type(
      screen.getByTestId("app-description-textarea"),
      "This is a test description",
    );

    await user.click(screen.getByTestId("wizard-next-button"));

    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 4: Requirements/)).toBeInTheDocument();
    });

    const backButton = screen.getByTestId("wizard-back-button");
    expect(backButton).not.toBeDisabled();
  });

  describe("Step 1 - Basic Info", () => {
    it("should validate name field", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "AB");
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const errors = screen.getAllByText("App name must be at least 3 characters");
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it("should validate description field", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(screen.getByTestId("app-description-textarea"), "Short");
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const errors = screen.getAllByText("Description must be at least 10 characters");
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it("should proceed to step 2 with valid data", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "This is a valid test description",
      );

      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 4: Requirements/)).toBeInTheDocument();
      });

      expect(screen.getByTestId("requirements-textarea")).toBeInTheDocument();
    });

    it("should accept name with hyphens and numbers", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test-App-123");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "This is a valid test description",
      );

      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 4: Requirements/)).toBeInTheDocument();
      });
    });

    it("should reject name with special characters", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test@App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "Valid description here",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const errors = screen.getAllByText(
          "App name can only contain letters, numbers, spaces, and hyphens",
        );
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Step 2 - Requirements", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "This is a test description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 4: Requirements/)).toBeInTheDocument();
      });
    });

    it("should render requirements textarea", () => {
      expect(screen.getByTestId("requirements-textarea")).toBeInTheDocument();
    });

    it("should validate requirements field", async () => {
      const user = userEvent.setup();

      await user.type(screen.getByTestId("requirements-textarea"), "Short");
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const errors = screen.getAllByText("Requirements must be at least 20 characters");
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it("should proceed to step 3 with valid requirements", async () => {
      const user = userEvent.setup();

      await user.type(
        screen.getByTestId("requirements-textarea"),
        "This app needs authentication and user profile management features",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(
          screen.getByText(/Step 3 of 4: Monetization/),
        ).toBeInTheDocument();
      });
    });

    it("should go back to step 1 when back button is clicked", async () => {
      const user = userEvent.setup();

      await user.click(screen.getByTestId("wizard-back-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 1 of 4: Basic Info/)).toBeInTheDocument();
      });
    });
  });

  describe("Step 3 - Monetization", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "This is a test description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 4: Requirements/)).toBeInTheDocument();
      });

      await user.type(
        screen.getByTestId("requirements-textarea"),
        "This app needs authentication and user profile management",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(
          screen.getByText(/Step 3 of 4: Monetization/),
        ).toBeInTheDocument();
      });
    });

    it("should render monetization select", () => {
      expect(screen.getByTestId("monetization-select")).toBeInTheDocument();
    });

    it("should validate monetization model selection", async () => {
      const user = userEvent.setup();

      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const errors = screen.getAllByText("Please select a monetization model");
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it("should proceed to step 4 with valid monetization model", async () => {
      const user = userEvent.setup();

      await user.click(screen.getByTestId("monetization-select"));

      await waitFor(() => {
        const options = screen.getAllByText("Free - No charge for users");
        expect(options.length).toBeGreaterThan(0);
      });

      const options = screen.getAllByText("Free - No charge for users");
      await user.click(options[options.length - 1]);

      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 4 of 4: Review/)).toBeInTheDocument();
      });
    });

    it("should show all monetization options", async () => {
      const user = userEvent.setup();

      await user.click(screen.getByTestId("monetization-select"));

      await waitFor(() => {
        expect(screen.getAllByText("Free - No charge for users").length).toBeGreaterThan(0);
        expect(
          screen.getAllByText("Freemium - Free with premium features").length,
        ).toBeGreaterThan(0);
        expect(
          screen.getAllByText("Subscription - Recurring payments").length,
        ).toBeGreaterThan(0);
        expect(
          screen.getAllByText("One-time Purchase - Single payment").length,
        ).toBeGreaterThan(0);
        expect(screen.getAllByText("Usage-based - Pay per use").length).toBeGreaterThan(0);
      });
    });
  });

  describe("Step 4 - Review", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "My Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "This is my test app description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 2 of 4/)[0]).toBeInTheDocument();
      });

      await user.type(
        screen.getByTestId("requirements-textarea"),
        "The app needs user authentication and profile management features",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 3 of 4/)[0]).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("monetization-select"));
      await waitFor(() => {
        const options = screen.getAllByText("Subscription - Recurring payments");
        expect(options.length).toBeGreaterThan(0);
      });
      const subscriptionOptions = screen.getAllByText("Subscription - Recurring payments");
      await user.click(subscriptionOptions[subscriptionOptions.length - 1]);

      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 4 of 4: Review/)).toBeInTheDocument();
      });
    });

    it("should display all entered data", async () => {
      await waitFor(() => {
        expect(screen.getByTestId("review-name")).toHaveTextContent("My Test App");
      }, { timeout: 5000 });
      expect(screen.getByTestId("review-description")).toHaveTextContent(
        "This is my test app description",
      );
      expect(screen.getByTestId("review-requirements")).toHaveTextContent(
        "The app needs user authentication and profile management features",
      );
      expect(screen.getByTestId("review-monetization")).toHaveTextContent(
        "Subscription - Recurring payments",
      );
    });

    it("should show Create App button on final step", () => {
      expect(screen.getByTestId("wizard-submit-button")).toHaveTextContent("Create App");
    });

    it("should create app and navigate on submit", async () => {
      const user = userEvent.setup();

      await user.click(screen.getByTestId("wizard-submit-button"));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/my-apps");
      });
    });

    it("should call API to save app on submit", async () => {
      const user = userEvent.setup();

      await user.click(screen.getByTestId("wizard-submit-button"));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/apps",
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }),
        );

        const callArgs = fetchMock.mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body).toMatchObject({
          name: "My Test App",
          description: "This is my test app description",
          requirements: "The app needs user authentication and profile management features",
          monetizationModel: "subscription",
        });
      });
    });

    it("should clear draft from localStorage on submit", async () => {
      const user = userEvent.setup();

      localStorageMock["app-creation-draft"] = JSON.stringify({
        name: "Draft App",
      });

      await user.click(screen.getByTestId("wizard-submit-button"));

      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith(
          "app-creation-draft",
        );
      });
    });
  });

  describe("LocalStorage persistence", () => {
    it("should save form data to localStorage as user types", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Draft App");

      await waitFor(
        () => {
          const draft = JSON.parse(
            localStorageMock["app-creation-draft"] || "{}",
          );
          expect(draft.name).toBe("Draft App");
        },
        { timeout: 3000 },
      );
    });

    it("should load saved draft on mount", async () => {
      localStorageMock["app-creation-draft"] = JSON.stringify({
        name: "Saved Draft",
        description: "Saved description from draft",
        requirements: "Saved requirements from draft",
        monetizationModel: "freemium",
      });

      render(<NewAppPage />);

      await waitFor(() => {
        const nameInput = screen.getByTestId(
          "app-name-input",
        ) as HTMLInputElement;
        expect(nameInput.value).toBe("Saved Draft");

        const descInput = screen.getByTestId(
          "app-description-textarea",
        ) as HTMLTextAreaElement;
        expect(descInput.value).toBe("Saved description from draft");
      });
    });

    it("should handle corrupted localStorage data gracefully", async () => {
      localStorageMock["app-creation-draft"] = "corrupted-json-data";

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(<NewAppPage />);

      await waitFor(() => {
        expect(screen.getByTestId("app-name-input")).toHaveValue("");
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Navigation", () => {
    it("should navigate through all steps forward", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      expect(screen.getAllByText(/Step 1 of 4/)[0]).toBeInTheDocument();

      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "Test description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 2 of 4/)[0]).toBeInTheDocument();
      });

      await user.type(
        screen.getByTestId("requirements-textarea"),
        "Requirements for the test app go here",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 3 of 4/)[0]).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("monetization-select"));
      await waitFor(() => {
        const options = screen.getAllByText("Free - No charge for users");
        expect(options.length).toBeGreaterThan(0);
      });
      const freeOptions = screen.getAllByText("Free - No charge for users");
      await user.click(freeOptions[freeOptions.length - 1]);
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 4 of 4/)[0]).toBeInTheDocument();
      });
    });

    it("should navigate backward through steps", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "Test description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 2 of 4/)[0]).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("wizard-back-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 1 of 4/)[0]).toBeInTheDocument();
      });
    });

    it("should preserve data when navigating backward", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "Test description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 2 of 4/)[0]).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("wizard-back-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 1 of 4/)[0]).toBeInTheDocument();
      });

      await waitFor(() => {
        const nameInput = screen.getByTestId("app-name-input") as HTMLInputElement;
        expect(nameInput.value).toBe("Test App");
      });
    });
  });

  describe("Progress indicator", () => {
    it("should update progress as steps advance", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      const progress = screen.getByTestId("wizard-progress");

      expect(progress).toBeInTheDocument();

      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "Test description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 2 of 4/)[0]).toBeInTheDocument();
      });
    });
  });

  describe("Form submission", () => {
    it("should append to existing apps in localStorage", async () => {
      const user = userEvent.setup();

      localStorageMock["my-apps"] = JSON.stringify([
        {
          id: "1",
          name: "Existing App",
          description: "Existing app description",
          requirements: "Existing requirements",
          monetizationModel: "free",
          createdAt: new Date().toISOString(),
        },
      ]);

      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "New App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "New app description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 2 of 4/)[0]).toBeInTheDocument();
      });

      await user.type(
        screen.getByTestId("requirements-textarea"),
        "New app requirements go here",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 3 of 4/)[0]).toBeInTheDocument();
      });

      const selectTrigger = screen.getByTestId("monetization-select");
      await user.click(selectTrigger);

      await waitFor(
        () => {
          const freeOptions = screen.queryAllByText("Free - No charge for users");
          if (freeOptions.length > 0) {
            return true;
          }
          throw new Error("Waiting for select options");
        },
        { timeout: 2000 },
      );

      const freeOptions = screen.getAllByText("Free - No charge for users");
      await user.click(freeOptions[freeOptions.length - 1]);

      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getAllByText(/Step 4 of 4/)[0]).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("wizard-submit-button"));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/apps",
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: expect.stringContaining("New App"),
          }),
        );
        expect(mockPush).toHaveBeenCalledWith("/my-apps");
      });
    });
  });

  describe("Validation Mode - Blur and onChange", () => {
    it("should validate on blur for name field", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      const nameInput = screen.getByTestId("app-name-input");
      await user.type(nameInput, "AB");
      await user.tab();

      await waitFor(() => {
        const errors = screen.getAllByText("App name must be at least 3 characters");
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it("should validate on blur for description field", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      const descInput = screen.getByTestId("app-description-textarea");
      await user.type(descInput, "Short");
      await user.tab();

      await waitFor(() => {
        const errors = screen.getAllByText("Description must be at least 10 characters");
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it("should show validation mode is set correctly", () => {
      render(<NewAppPage />);

      const nameInput = screen.getByTestId("app-name-input");
      expect(nameInput).toBeInTheDocument();
    });
  });

  describe("Character Counters", () => {
    it("should display character counter for name field", () => {
      render(<NewAppPage />);

      const counters = screen.getAllByTestId("char-counter");
      expect(counters.length).toBeGreaterThan(0);
    });

    it("should update character count as user types in name field", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test");

      await waitFor(() => {
        const counters = screen.getAllByTestId("char-counter");
        const nameCounter = counters.find(c => c.textContent?.includes("4 / 50"));
        expect(nameCounter).toBeInTheDocument();
      });
    });

    it("should show warning when under minimum characters", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "AB");

      await waitFor(() => {
        const warning = screen.getByTestId("char-counter-warning");
        expect(warning).toHaveTextContent("minimum 3");
      });
    });

    it("should show character counter for description field", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-description-textarea"), "Test desc");

      await waitFor(() => {
        const counters = screen.getAllByTestId("char-counter");
        const descCounter = counters.find(c => c.textContent?.includes("9 / 500"));
        expect(descCounter).toBeInTheDocument();
      });
    });

    it("should show character counter for requirements field", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "Valid description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const stepTexts = screen.getAllByText(/Step 2 of 4/);
        expect(stepTexts.length).toBeGreaterThan(0);
      });

      await user.type(screen.getByTestId("requirements-textarea"), "Test req");

      await waitFor(() => {
        const counters = screen.getAllByTestId("char-counter");
        const reqCounter = counters.find(c => c.textContent?.includes("8 / 2000"));
        expect(reqCounter).toBeInTheDocument();
      });
    });
  });

  describe("Field Status Icons", () => {
    it("should show error icon when name field has error", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "AB");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId("error-icon")).toBeInTheDocument();
      });
    });

    it("should show success icon when name field is valid and dirty", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Valid App Name");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId("success-icon")).toBeInTheDocument();
      });
    });

    it("should show error icon when description field has error", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-description-textarea"), "Short");
      await user.tab();

      await waitFor(() => {
        const errorIcons = screen.getAllByTestId("error-icon");
        expect(errorIcons.length).toBeGreaterThan(0);
      });
    });

    it("should show success icon when description field is valid and dirty", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(
        screen.getByTestId("app-description-textarea"),
        "This is a valid description with enough characters",
      );
      await user.tab();

      await waitFor(() => {
        const successIcons = screen.getAllByTestId("success-icon");
        expect(successIcons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Error Summary Panel", () => {
    it("should not show error summary when no errors", () => {
      render(<NewAppPage />);

      expect(screen.queryByTestId("error-summary")).not.toBeInTheDocument();
    });

    it("should show error summary when validation fails", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "AB");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId("error-summary")).toBeInTheDocument();
      });
    });

    it("should list all validation errors in summary", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "AB");
      await user.type(screen.getByTestId("app-description-textarea"), "Short");
      await user.tab();
      await user.tab();

      await waitFor(() => {
        const summary = screen.getByTestId("error-summary");
        expect(summary).toBeInTheDocument();
        expect(screen.getByTestId("error-item-0")).toBeInTheDocument();
      });
    });

    it("should show error summary with proper formatting", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "A");
      await user.tab();

      await waitFor(() => {
        const summary = screen.getByTestId("error-summary");
        expect(summary).toHaveTextContent("Validation Errors");
        expect(summary).toHaveTextContent("App Name:");
        const errors = screen.getAllByText("App name must be at least 3 characters");
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it("should show error summary appears and disappears correctly", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      const nameInput = screen.getByTestId("app-name-input");
      await user.type(nameInput, "AB");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId("error-summary")).toBeInTheDocument();
      });

      expect(screen.getByTestId("error-summary")).toBeInTheDocument();
    });
  });

  describe("Requirements Field Guidance", () => {
    it("should show template placeholder for requirements field", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "Valid description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const stepTexts = screen.getAllByText(/Step 2 of 4/);
        expect(stepTexts.length).toBeGreaterThan(0);
      });

      const reqInput = screen.getByTestId("requirements-textarea");
      expect(reqInput).toHaveAttribute(
        "placeholder",
        expect.stringContaining("Example requirements"),
      );
    });

    it("should apply monospace font to requirements field", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "Valid description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const reqInput = screen.getByTestId("requirements-textarea");
        expect(reqInput).toHaveClass("font-mono");
      });
    });

    it("should validate requirements with minimum characters", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "Valid description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const stepTexts = screen.getAllByText(/Step 2 of 4/);
        expect(stepTexts.length).toBeGreaterThan(0);
      });

      await user.type(screen.getByTestId("requirements-textarea"), "Short");
      await user.tab();

      await waitFor(() => {
        const errors = screen.getAllByText("Requirements must be at least 20 characters");
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe("CharacterCounter Component", () => {
    it("should show correct count when empty", () => {
      render(<NewAppPage />);

      const counters = screen.getAllByTestId("char-counter");
      expect(counters.length).toBeGreaterThan(0);
    });

    it("should highlight when over max characters", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      const longName = "A".repeat(51);
      await user.type(screen.getByTestId("app-name-input"), longName);

      await waitFor(() => {
        const counters = screen.getAllByTestId("char-counter");
        const nameCounter = counters.find(c => c.textContent?.includes("51 / 50"));
        expect(nameCounter).toHaveClass("text-destructive");
      });
    });
  });

  describe("FieldStatusIcon Component", () => {
    it("should not show icon when field is empty and untouched", () => {
      render(<NewAppPage />);

      expect(screen.queryByTestId("error-icon")).not.toBeInTheDocument();
      expect(screen.queryByTestId("success-icon")).not.toBeInTheDocument();
    });

    it("should show error icon before success icon when both conditions exist", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "AB");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId("error-icon")).toBeInTheDocument();
        expect(screen.queryByTestId("success-icon")).not.toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle review step validation (step 3)", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      // Navigate to review step
      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(screen.getByTestId("app-description-textarea"), "Valid description");
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const stepTexts = screen.getAllByText(/Step 2 of 4/);
        expect(stepTexts.length).toBeGreaterThan(0);
      });

      await user.type(
        screen.getByTestId("requirements-textarea"),
        "Valid requirements for testing",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const stepTexts = screen.getAllByText(/Step 3 of 4/);
        expect(stepTexts.length).toBeGreaterThan(0);
      });

      await user.click(screen.getByTestId("monetization-select"));
      await waitFor(() => {
        const options = screen.getAllByText("Free - No charge for users");
        expect(options.length).toBeGreaterThan(0);
      });

      const options = screen.getAllByText("Free - No charge for users");
      await user.click(options[options.length - 1]);
      await user.click(screen.getByTestId("wizard-next-button"));

      // Now on review step (step 3)
      await waitFor(() => {
        const stepTexts = screen.getAllByText(/Step 4 of 4/);
        expect(stepTexts.length).toBeGreaterThan(0);
      });

      // Click next on review step - should submit
      const submitButton = screen.getByTestId("wizard-submit-button");
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe("API Error Handling", () => {
    it("should handle API error response and not navigate", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock fetch to return an error response
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: "App name already exists" }),
      } as Response);

      render(<NewAppPage />);

      // Complete the form
      await user.type(screen.getByTestId("app-name-input"), "Duplicate App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "This is a test description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 4: Requirements/)).toBeInTheDocument();
      });

      await user.type(
        screen.getByTestId("requirements-textarea"),
        "The app needs authentication and user profile management",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 3 of 4: Monetization/)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("monetization-select"));
      await waitFor(() => {
        const options = screen.getAllByText("Free - No charge for users");
        expect(options.length).toBeGreaterThan(0);
      });
      const options = screen.getAllByText("Free - No charge for users");
      await user.click(options[options.length - 1]);
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 4 of 4: Review/)).toBeInTheDocument();
      });

      // Submit the form
      await user.click(screen.getByTestId("wizard-submit-button"));

      // Wait for the API call and error logging
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to create app:",
          { message: "App name already exists" },
        );
      });

      // Should NOT navigate on error
      expect(mockPush).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should handle network error and log it", async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock fetch to throw a network error
      const networkError = new Error("Network error");
      fetchMock.mockRejectedValueOnce(networkError);

      render(<NewAppPage />);

      // Complete the form
      await user.type(screen.getByTestId("app-name-input"), "Test App");
      await user.type(
        screen.getByTestId("app-description-textarea"),
        "This is a test description",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 4: Requirements/)).toBeInTheDocument();
      });

      await user.type(
        screen.getByTestId("requirements-textarea"),
        "The app needs authentication and user profile management",
      );
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 3 of 4: Monetization/)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("monetization-select"));
      await waitFor(() => {
        const options = screen.getAllByText("Free - No charge for users");
        expect(options.length).toBeGreaterThan(0);
      });
      const options = screen.getAllByText("Free - No charge for users");
      await user.click(options[options.length - 1]);
      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        expect(screen.getByText(/Step 4 of 4: Review/)).toBeInTheDocument();
      });

      // Submit the form
      await user.click(screen.getByTestId("wizard-submit-button"));

      // Wait for the error to be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Error creating app:",
          networkError,
        );
      });

      // Should NOT navigate on error
      expect(mockPush).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Integration - All Features Together", () => {
    it("should show all validation enhancements working together", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      const nameInput = screen.getByTestId("app-name-input");
      await user.type(nameInput, "A");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId("error-summary")).toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByTestId("error-icon")).toBeInTheDocument();
      }, { timeout: 3000 });

      const counters = screen.getAllByTestId("char-counter");
      expect(counters.length).toBeGreaterThan(0);
      expect(screen.getByTestId("char-counter-warning")).toBeInTheDocument();
    });

    it("should handle complete form flow with all enhancements", async () => {
      const user = userEvent.setup();
      render(<NewAppPage />);

      await user.type(screen.getByTestId("app-name-input"), "Great App");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId("success-icon")).toBeInTheDocument();
      });

      await user.type(
        screen.getByTestId("app-description-textarea"),
        "This is a comprehensive description",
      );
      await user.tab();

      await waitFor(() => {
        const successIcons = screen.getAllByTestId("success-icon");
        expect(successIcons.length).toBe(2);
      });

      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const stepTexts = screen.getAllByText(/Step 2 of 4/);
        expect(stepTexts.length).toBeGreaterThan(0);
      });

      await user.type(
        screen.getByTestId("requirements-textarea"),
        "This app needs authentication and profile management",
      );

      await waitFor(() => {
        const counters = screen.getAllByTestId("char-counter");
        expect(counters.length).toBeGreaterThan(0);
      });

      await user.click(screen.getByTestId("wizard-next-button"));

      await waitFor(() => {
        const stepTexts = screen.getAllByText(/Step 3 of 4/);
        expect(stepTexts.length).toBeGreaterThan(0);
      });
    });
  });
});
