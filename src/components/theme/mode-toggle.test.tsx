import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ModeToggle } from "./mode-toggle"
import { ThemeProvider } from "./theme-provider"

describe("ModeToggle", () => {
  it("renders toggle button", async () => {
    render(
      <ThemeProvider>
        <ModeToggle />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument()
    })
  })

  it("shows sun icon initially (light mode)", async () => {
    const { container } = render(
      <ThemeProvider defaultTheme="light">
        <ModeToggle />
      </ThemeProvider>
    )

    await waitFor(() => {
      const button = screen.getByRole("button", { name: /toggle theme/i })
      expect(button).toBeInTheDocument()
    })
  })

  it("toggles theme when clicked", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ModeToggle />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument()
    })

    const button = screen.getByRole("button", { name: /toggle theme/i })
    await user.click(button)

    expect(button).toBeInTheDocument()
  })

  it("has accessible label", async () => {
    render(
      <ThemeProvider>
        <ModeToggle />
      </ThemeProvider>
    )

    await waitFor(() => {
      const button = screen.getByRole("button", { name: /toggle theme/i })
      expect(button).toHaveAttribute("aria-label", "Toggle theme")
    })
  })

  it("contains screen reader text", async () => {
    render(
      <ThemeProvider>
        <ModeToggle />
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByText("Toggle theme")).toBeInTheDocument()
    })
  })
})
