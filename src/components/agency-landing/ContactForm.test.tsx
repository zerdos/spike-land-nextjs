import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ContactForm } from "./ContactForm"
import userEvent from "@testing-library/user-event"

describe("ContactForm", () => {
  it("renders all form fields", () => {
    render(<ContactForm />)
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument()
  })

  it("shows validation errors for empty fields", async () => {
    render(<ContactForm />)
    
    const submitButton = screen.getByRole("button", { name: /send message/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Name must be at least 2 characters.")).toBeInTheDocument()
      expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument()
      expect(screen.getByText("Company name is required.")).toBeInTheDocument()
      expect(screen.getByText("Message must be at least 10 characters.")).toBeInTheDocument()
    })
  })

  it("shows validation error for invalid email", async () => {
    render(<ContactForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    fireEvent.change(emailInput, { target: { value: "invalid-email" } })
    
    const submitButton = screen.getByRole("button", { name: /send message/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument()
    })
  })

  it("shows validation error for short message", async () => {
    render(<ContactForm />)
    
    const messageInput = screen.getByLabelText(/message/i)
    fireEvent.change(messageInput, { target: { value: "short" } })
    
    const submitButton = screen.getByRole("button", { name: /send message/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText("Message must be at least 10 characters.")).toBeInTheDocument()
    })
  })

  it("submits the form with valid data", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    
    render(<ContactForm />)
    
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "John Doe" } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "john@example.com" } })
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: "Acme Inc." } })
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "This is a valid message for testing." } })
    
    const submitButton = screen.getByRole("button", { name: /send message/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        company: "Acme Inc.",
        message: "This is a valid message for testing.",
      })
    })
    
    logSpy.mockRestore()
  })
})
