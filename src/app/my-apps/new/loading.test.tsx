import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import NewAppLoading from "./loading"

describe("NewAppLoading", () => {
  it("renders without crashing", () => {
    const { container } = render(<NewAppLoading />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it("renders WizardStepSkeleton component", () => {
    const { container } = render(<NewAppLoading />)
    const wrapper = container.querySelector('.max-w-2xl')
    expect(wrapper).toBeInTheDocument()
  })

  it("renders skeleton elements", () => {
    const { container } = render(<NewAppLoading />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
