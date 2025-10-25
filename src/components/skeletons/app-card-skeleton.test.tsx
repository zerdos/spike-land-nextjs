import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { AppCardSkeleton } from "./app-card-skeleton"

describe("AppCardSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<AppCardSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it("renders card structure", () => {
    const { container } = render(<AppCardSkeleton />)
    const card = container.querySelector('[class*="rounded-xl"]')
    expect(card).toBeInTheDocument()
  })

  it("renders skeleton elements", () => {
    const { container } = render(<AppCardSkeleton />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("matches expected structure", () => {
    const { container } = render(<AppCardSkeleton />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBe(4)
  })
})
