import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { useSearchParams } from "next/navigation"
import SignInPage from "./page"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}))

// Mock auth components
vi.mock("@/components/auth/auth-buttons", () => ({
  AuthButtons: ({ className }: { className?: string }) => (
    <div data-testid="auth-buttons" className={className}>
      Auth Buttons
    </div>
  ),
}))

describe("SignInPage", () => {
  beforeEach(() => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as any)
  })

  describe("Page Structure", () => {
    it("should render the sign in page", () => {
      render(<SignInPage />)
      expect(screen.getByText("Welcome to Spike Land")).toBeInTheDocument()
    })

    it("should display the page description", () => {
      render(<SignInPage />)
      expect(
        screen.getByText("Sign in to access your apps and create new ones")
      ).toBeInTheDocument()
    })

    it("should render AuthButtons component", () => {
      render(<SignInPage />)
      expect(screen.getByTestId("auth-buttons")).toBeInTheDocument()
    })

    it("should have a link back to home", () => {
      render(<SignInPage />)
      const homeLink = screen.getByRole("link", { name: /back to home/i })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute("href", "/")
    })

    it("should display terms and privacy policy notice", () => {
      render(<SignInPage />)
      expect(
        screen.getByText(/by signing in, you agree to our terms of service/i)
      ).toBeInTheDocument()
    })
  })

  describe("Error Handling", () => {
    it("should not display error alert when no error param", () => {
      render(<SignInPage />)
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })

    it("should display OAuthSignin error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) =>
          param === "error" ? "OAuthSignin" : null
        ),
      } as any)

      render(<SignInPage />)
      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(
        screen.getByText("Error starting OAuth sign in")
      ).toBeInTheDocument()
    })

    it("should display OAuthCallback error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) =>
          param === "error" ? "OAuthCallback" : null
        ),
      } as any)

      render(<SignInPage />)
      expect(
        screen.getByText("Error during OAuth callback")
      ).toBeInTheDocument()
    })

    it("should display OAuthCreateAccount error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) =>
          param === "error" ? "OAuthCreateAccount" : null
        ),
      } as any)

      render(<SignInPage />)
      expect(
        screen.getByText("Could not create OAuth account")
      ).toBeInTheDocument()
    })

    it("should display EmailCreateAccount error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) =>
          param === "error" ? "EmailCreateAccount" : null
        ),
      } as any)

      render(<SignInPage />)
      expect(
        screen.getByText("Could not create email account")
      ).toBeInTheDocument()
    })

    it("should display Callback error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) =>
          param === "error" ? "Callback" : null
        ),
      } as any)

      render(<SignInPage />)
      expect(screen.getByText("Error in callback handler")).toBeInTheDocument()
    })

    it("should display OAuthAccountNotLinked error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) =>
          param === "error" ? "OAuthAccountNotLinked" : null
        ),
      } as any)

      render(<SignInPage />)
      expect(
        screen.getByText("This account is already linked to another user")
      ).toBeInTheDocument()
    })

    it("should display EmailSignin error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) =>
          param === "error" ? "EmailSignin" : null
        ),
      } as any)

      render(<SignInPage />)
      expect(
        screen.getByText("Check your email for a sign in link")
      ).toBeInTheDocument()
    })

    it("should display CredentialsSignin error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) =>
          param === "error" ? "CredentialsSignin" : null
        ),
      } as any)

      render(<SignInPage />)
      expect(
        screen.getByText("Sign in failed. Check your credentials")
      ).toBeInTheDocument()
    })

    it("should display SessionRequired error message", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) =>
          param === "error" ? "SessionRequired" : null
        ),
      } as any)

      render(<SignInPage />)
      expect(
        screen.getByText("Please sign in to access this page")
      ).toBeInTheDocument()
    })

    it("should display default error message for unknown errors", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) =>
          param === "error" ? "UnknownError" : null
        ),
      } as any)

      render(<SignInPage />)
      expect(
        screen.getByText("An error occurred during sign in")
      ).toBeInTheDocument()
    })
  })

  describe("Callback URL", () => {
    it("should handle callbackUrl parameter", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) =>
          param === "callbackUrl" ? "/my-apps" : null
        ),
      } as any)

      render(<SignInPage />)
      // Component renders without errors when callbackUrl is present
      expect(screen.getByText("Welcome to Spike Land")).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      render(<SignInPage />)
      const title = screen.getByText("Welcome to Spike Land", { selector: ".text-2xl" })
      expect(title).toBeInTheDocument()
      expect(title).toHaveClass("text-2xl")
    })

    it("should have descriptive link text", () => {
      render(<SignInPage />)
      const homeLink = screen.getByRole("link", { name: /back to home/i })
      expect(homeLink).toHaveAccessibleName()
    })
  })
})
