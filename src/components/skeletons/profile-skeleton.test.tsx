import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { ProfileSkeleton } from "./profile-skeleton"

describe("ProfileSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<ProfileSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it("renders container", () => {
    const { container } = render(<ProfileSkeleton />)
    const wrapper = container.querySelector('.container')
    expect(wrapper).toBeInTheDocument()
  })

  it("renders multiple cards", () => {
    const { container } = render(<ProfileSkeleton />)
    const cards = container.querySelectorAll('[class*="rounded-xl"]')
    expect(cards.length).toBe(2)
  })

  it("renders avatar skeleton", () => {
    const { container } = render(<ProfileSkeleton />)
    const avatar = container.querySelector('.rounded-full')
    expect(avatar).toBeInTheDocument()
  })

  it("renders skeleton elements", () => {
    const { container } = render(<ProfileSkeleton />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("matches expected structure", () => {
    const { container } = render(<ProfileSkeleton />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBe(13)
  })
})
