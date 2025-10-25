import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import ProfileLoading from "./loading"

describe("ProfileLoading", () => {
  it("renders without crashing", () => {
    const { container } = render(<ProfileLoading />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it("renders ProfileSkeleton component", () => {
    const { container } = render(<ProfileLoading />)
    const wrapper = container.querySelector('.container')
    expect(wrapper).toBeInTheDocument()
  })

  it("renders skeleton elements", () => {
    const { container } = render(<ProfileLoading />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("renders multiple cards", () => {
    const { container } = render(<ProfileLoading />)
    const cards = container.querySelectorAll('[class*="rounded-xl"]')
    expect(cards.length).toBe(2)
  })
})
