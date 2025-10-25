import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { SettingsSkeleton } from "./settings-skeleton"

describe("SettingsSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<SettingsSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it("renders container with proper max-width", () => {
    const { container } = render(<SettingsSkeleton />)
    const wrapper = container.querySelector('.max-w-4xl')
    expect(wrapper).toBeInTheDocument()
  })

  it("renders card structure", () => {
    const { container } = render(<SettingsSkeleton />)
    const card = container.querySelector('[class*="rounded-xl"]')
    expect(card).toBeInTheDocument()
  })

  it("renders avatar skeleton", () => {
    const { container } = render(<SettingsSkeleton />)
    const avatar = container.querySelector('.rounded-full')
    expect(avatar).toBeInTheDocument()
  })

  it("renders tabs skeleton", () => {
    const { container } = render(<SettingsSkeleton />)
    const tabs = container.querySelector('.gap-2')
    expect(tabs).toBeInTheDocument()
  })

  it("renders skeleton elements", () => {
    const { container } = render(<SettingsSkeleton />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("matches expected structure", () => {
    const { container } = render(<SettingsSkeleton />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBe(17)
  })
})
