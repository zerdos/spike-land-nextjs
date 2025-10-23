import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { useSearchParams } from "next/navigation"
import AuthErrorPage from "./page"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}))

describe("AuthErrorPage", () => {
  beforeEach(() => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as any)
  })

  describe("Page Structure", () => {
    it("should render the error page", () => {
      render(<AuthErrorPage />)
      expect(screen.getByText("Authentication Error")).toBeInTheDocument()
    })

    it("should display the page description", () => {
      render(<AuthErrorPage />)
      expect(
        screen.getByText("Something went wrong during the authentication process")
      ).toBeInTheDocument()
    })

    it("should have Try Again button", () => {
      render(<AuthErrorPage />)
      const tryAgainButton = screen.getByRole("link", { name: /try again/i })
      expect(tryAgainButton).toBeInTheDocument()
      expect(tryAgainButton).toHaveAttribute("href", "/auth/signin")
    })

    it("should have Back to Home button", () => {
      render(<AuthErrorPage />)
      const homeButton = screen.getByRole("link", { name: /back to home/i })
      expect(homeButton).toBeInTheDocument()
      expect(homeButton).toHaveAttribute("href", "/")
    })

    it("should display support notice", () => {
      render(<AuthErrorPage />)
      expect(
        screen.getByText("If this problem persists, please contact support")
      ).toBeInTheDocument()
    })
  })

  describe("Error Messages", () => {
    it("should display default error when no error param", () => {
      render(<AuthErrorPage />)
      expect(screen.getByText("Authentication Error")).toBeInTheDocument()
      expect(
        screen.getByText("An unexpected error occurred during authentication. Please try again later.")
      ).toBeInTheDocument()
    })

    it("should display Configuration error", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "Configuration" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("Server Configuration Error")).toBeInTheDocument()
      expect(
        screen.getByText(/there is a problem with the server configuration/i)
      ).toBeInTheDocument()
    })

    it("should display AccessDenied error", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "AccessDenied" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("Access Denied")).toBeInTheDocument()
      expect(
        screen.getByText(/you do not have permission to sign in/i)
      ).toBeInTheDocument()
    })

    it("should display Verification error", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "Verification" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("Verification Error")).toBeInTheDocument()
      expect(
        screen.getByText(/the verification token has expired/i)
      ).toBeInTheDocument()
    })

    it("should display OAuthSignin error", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "OAuthSignin" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("OAuth Sign In Error")).toBeInTheDocument()
    })

    it("should display OAuthCallback error", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "OAuthCallback" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("OAuth Callback Error")).toBeInTheDocument()
    })

    it("should display OAuthCreateAccount error", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "OAuthCreateAccount" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("OAuth Account Creation Error")).toBeInTheDocument()
    })

    it("should display EmailCreateAccount error", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "EmailCreateAccount" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("Email Account Creation Error")).toBeInTheDocument()
    })

    it("should display Callback error", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "Callback" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("Callback Error")).toBeInTheDocument()
    })

    it("should display OAuthAccountNotLinked error", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "OAuthAccountNotLinked" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("Account Already Linked")).toBeInTheDocument()
    })

    it("should display EmailSignin error", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "EmailSignin" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("Email Sign In Error")).toBeInTheDocument()
    })

    it("should display CredentialsSignin error", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "CredentialsSignin" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument()
    })

    it("should display SessionRequired error", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "SessionRequired" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("Session Required")).toBeInTheDocument()
    })

    it("should display error code when error param exists", () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((param) => (param === "error" ? "OAuthSignin" : null)),
      } as any)

      render(<AuthErrorPage />)
      expect(screen.getByText("Error Code:")).toBeInTheDocument()
      expect(screen.getByText("OAuthSignin")).toBeInTheDocument()
    })

    it("should not display error code when no error param", () => {
      render(<AuthErrorPage />)
      expect(screen.queryByText("Error Code:")).not.toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      const { container } = render(<AuthErrorPage />)
      const title = container.querySelector("h3")
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent("Authentication Error")
    })

    it("should have descriptive link text", () => {
      render(<AuthErrorPage />)
      const tryAgainLink = screen.getByRole("link", { name: /try again/i })
      const homeLink = screen.getByRole("link", { name: /back to home/i })
      expect(tryAgainLink).toHaveAccessibleName()
      expect(homeLink).toHaveAccessibleName()
    })

    it("should have error icon for visual indication", () => {
      const { container } = render(<AuthErrorPage />)
      const icons = container.querySelectorAll("svg")
      expect(icons.length).toBeGreaterThan(0)
    })
  })
})
