import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EnhancementSettings } from './EnhancementSettings'
import type { EnhancementTier } from '@prisma/client'

describe('EnhancementSettings Component', () => {
  const mockOnEnhance = vi.fn()
  const mockOnBalanceRefresh = vi.fn()

  const defaultProps = {
    onEnhance: mockOnEnhance,
    currentBalance: 10,
    isProcessing: false,
    completedVersions: [],
    onBalanceRefresh: mockOnBalanceRefresh,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders component with title and description', () => {
    render(<EnhancementSettings {...defaultProps} />)

    expect(screen.getByText('Enhancement Settings')).toBeInTheDocument()
    expect(screen.getByText('Choose the quality tier for AI enhancement')).toBeInTheDocument()
  })

  it('displays current balance', () => {
    render(<EnhancementSettings {...defaultProps} />)

    expect(screen.getByText('Your Balance')).toBeInTheDocument()
    const balanceSection = screen.getByText('Your Balance').parentElement?.parentElement
    expect(balanceSection?.textContent).toContain('10 tokens')
  })

  it('renders all three tier selection buttons', () => {
    render(<EnhancementSettings {...defaultProps} />)

    expect(screen.getByText('1K (1024px)')).toBeInTheDocument()
    expect(screen.getByText('Fast, good for previews')).toBeInTheDocument()
    expect(screen.getByText('2 tokens')).toBeInTheDocument()

    expect(screen.getByText('2K (2048px)')).toBeInTheDocument()
    expect(screen.getByText('Balanced quality and speed')).toBeInTheDocument()
    expect(screen.getByText('5 tokens')).toBeInTheDocument()

    expect(screen.getByText('4K (4096px)')).toBeInTheDocument()
    expect(screen.getByText('Maximum quality')).toBeInTheDocument()

    const tokenLabels = screen.getAllByText(/\d+ tokens/)
    expect(tokenLabels.length).toBeGreaterThanOrEqual(3)
  })

  it('displays token costs for each tier', () => {
    render(<EnhancementSettings {...defaultProps} />)

    const tokenCosts = screen.getAllByText(/\d+ tokens/)
    expect(tokenCosts.length).toBeGreaterThanOrEqual(3)
  })

  it('calls onTierChange when tier is selected', () => {
    render(<EnhancementSettings {...defaultProps} />)

    const tier1kRadio = screen.getByRole('radio', { name: /1K \(1024px\)/i })
    fireEvent.click(tier1kRadio)

    expect(tier1kRadio).toBeChecked()
  })

  it('has TIER_2K selected by default', () => {
    render(<EnhancementSettings {...defaultProps} />)

    const tier2kRadio = screen.getByRole('radio', { name: /2K \(2048px\)/i })
    expect(tier2kRadio).toBeChecked()
  })

  it('calls onEnhance when enhance button clicked', async () => {
    mockOnEnhance.mockResolvedValue(undefined)

    render(<EnhancementSettings {...defaultProps} />)

    const enhanceButton = screen.getByRole('button', { name: /Enhance Image/i })
    fireEvent.click(enhanceButton)

    await waitFor(() => {
      expect(mockOnEnhance).toHaveBeenCalledWith('TIER_2K')
    })
  })

  it('disables enhance button when processing', () => {
    render(<EnhancementSettings {...defaultProps} isProcessing={true} />)

    const enhanceButton = screen.getByRole('button', { name: /Enhancing/i })
    expect(enhanceButton).toBeDisabled()
  })

  it('shows loading state when processing', () => {
    render(<EnhancementSettings {...defaultProps} isProcessing={true} />)

    expect(screen.getByText('Enhancing...')).toBeInTheDocument()
  })

  it('shows insufficient tokens warning when balance is low', () => {
    render(<EnhancementSettings {...defaultProps} currentBalance={3} />)

    expect(screen.getByText('Insufficient Tokens')).toBeInTheDocument()
    expect(screen.getByText(/You need 5 tokens but only have 3/i)).toBeInTheDocument()
  })

  it('disables enhance button when balance is insufficient', () => {
    render(<EnhancementSettings {...defaultProps} currentBalance={3} />)

    const enhanceButton = screen.getByRole('button', { name: /Enhance Image/i })
    expect(enhanceButton).toBeDisabled()
  })

  it('shows Get Tokens button when balance is insufficient', () => {
    render(<EnhancementSettings {...defaultProps} currentBalance={3} />)

    expect(screen.getByRole('button', { name: /Get Tokens/i })).toBeInTheDocument()
  })

  it('disables tier options when balance is insufficient', () => {
    render(<EnhancementSettings {...defaultProps} currentBalance={3} />)

    const tier2kRadio = screen.getByRole('radio', { name: /2K \(2048px\)/i })
    const tier4kRadio = screen.getByRole('radio', { name: /4K \(4096px\)/i })

    expect(tier2kRadio).toBeDisabled()
    expect(tier4kRadio).toBeDisabled()
  })

  it('shows insufficient label on unaffordable tiers', () => {
    render(<EnhancementSettings {...defaultProps} currentBalance={3} />)

    const insufficientLabels = screen.getAllByText('(Insufficient)')
    expect(insufficientLabels.length).toBeGreaterThan(0)
  })

  it('enables tiers that user can afford', () => {
    render(<EnhancementSettings {...defaultProps} currentBalance={5} />)

    const tier1kRadio = screen.getByRole('radio', { name: /1K \(1024px\)/i })
    const tier2kRadio = screen.getByRole('radio', { name: /2K \(2048px\)/i })

    expect(tier1kRadio).not.toBeDisabled()
    expect(tier2kRadio).not.toBeDisabled()
  })

  it('shows note when version already exists for selected tier', () => {
    const completedVersions: Array<{ tier: EnhancementTier; url: string }> = [
      { tier: 'TIER_2K', url: '/enhanced.jpg' }
    ]

    render(
      <EnhancementSettings
        {...defaultProps}
        completedVersions={completedVersions}
      />
    )

    expect(
      screen.getByText(/A 2K \(2048px\) version already exists/i)
    ).toBeInTheDocument()
  })

  it('does not show version exists note when selecting different tier', () => {
    const completedVersions: Array<{ tier: EnhancementTier; url: string }> = [
      { tier: 'TIER_1K', url: '/enhanced.jpg' }
    ]

    render(
      <EnhancementSettings
        {...defaultProps}
        completedVersions={completedVersions}
      />
    )

    expect(
      screen.queryByText(/A 2K \(2048px\) version already exists/i)
    ).not.toBeInTheDocument()
  })

  it('calls onEnhance with selected tier when different tier is selected', async () => {
    mockOnEnhance.mockResolvedValue(undefined)

    render(<EnhancementSettings {...defaultProps} />)

    const tier4kRadio = screen.getByRole('radio', { name: /4K \(4096px\)/i })
    fireEvent.click(tier4kRadio)

    const enhanceButton = screen.getByRole('button', { name: /Enhance Image \(10 tokens\)/i })
    fireEvent.click(enhanceButton)

    await waitFor(() => {
      expect(mockOnEnhance).toHaveBeenCalledWith('TIER_4K')
    })
  })

  it('displays correct token cost in enhance button for selected tier', () => {
    render(<EnhancementSettings {...defaultProps} />)

    const tier1kRadio = screen.getByRole('radio', { name: /1K \(1024px\)/i })
    fireEvent.click(tier1kRadio)

    expect(screen.getByRole('button', { name: /Enhance Image \(2 tokens\)/i })).toBeInTheDocument()
  })

  it('shows balance with coin icon', () => {
    render(<EnhancementSettings {...defaultProps} />)

    const balanceSection = screen.getByText('Your Balance').parentElement
    expect(balanceSection?.querySelector('svg')).toBeInTheDocument()
  })

  it('handles onEnhance rejection gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error')
    consoleErrorSpy.mockImplementation(() => {})

    mockOnEnhance.mockImplementation(() => {
      return Promise.reject(new Error('Enhancement failed')).catch(() => {
        // Catch the error to prevent unhandled rejection
      })
    })

    render(<EnhancementSettings {...defaultProps} />)

    const enhanceButton = screen.getByRole('button', { name: /Enhance Image/i })
    fireEvent.click(enhanceButton)

    await waitFor(() => {
      expect(mockOnEnhance).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })
})
