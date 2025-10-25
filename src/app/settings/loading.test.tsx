import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import SettingsLoading from "./loading"

describe("SettingsLoading", () => {
  it("renders without crashing", () => {
    const { container } = render(<SettingsLoading />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it("renders SettingsSkeleton component", () => {
    const { container } = render(<SettingsLoading />)
    const wrapper = container.querySelector('.max-w-4xl')
    expect(wrapper).toBeInTheDocument()
  })

  it("renders skeleton elements", () => {
    const { container } = render(<SettingsLoading />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("renders card structure", () => {
    const { container } = render(<SettingsLoading />)
    const card = container.querySelector('[class*="rounded-xl"]')
    expect(card).toBeInTheDocument()
  })
})
