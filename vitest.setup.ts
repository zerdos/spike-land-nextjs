import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

// Suppress console warnings and errors during tests
beforeAll(() => {
  // Suppress console.error
  vi.spyOn(console, 'error').mockImplementation(() => {})
  // Suppress console.warn
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  // Suppress console.log
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})
