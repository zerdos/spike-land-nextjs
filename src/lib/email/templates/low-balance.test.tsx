import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import { LowBalanceEmail } from './low-balance'

describe('LowBalanceEmail', () => {
  const defaultProps = {
    userName: 'John Doe',
    userEmail: 'john@example.com',
    currentBalance: 3,
  }

  it('render low balance warning with user name', async () => {
    const html = await render(<LowBalanceEmail {...defaultProps} />)

    expect(html).toContain('Hi')
    expect(html).toContain('John Doe')
    expect(html).toContain('Running Low on Tokens')
  })

  it('use email username when name is not provided', async () => {
    const html = await render(
      <LowBalanceEmail
        {...defaultProps}
        userName={undefined}
        userEmail="jane.smith@example.com"
      />
    )

    expect(html).toContain('Hi')
    expect(html).toContain('jane.smith')
  })

  it('display current balance with plural tokens', async () => {
    const html = await render(<LowBalanceEmail {...defaultProps} currentBalance={3} />)

    expect(html).toContain('Current Balance')
    expect(html).toContain('3')
    expect(html).toContain('token')
    expect(html).toContain('remaining')
  })

  it('display singular token for balance of 1', async () => {
    const html = await render(<LowBalanceEmail {...defaultProps} currentBalance={1} />)

    expect(html).toContain('1')
    expect(html).toContain('token')
    expect(html).toContain('remaining')
  })

  it('list all token packages', async () => {
    const html = await render(<LowBalanceEmail {...defaultProps} />)

    expect(html).toContain('Starter Pack')
    expect(html).toContain('10 tokens - £2.99')
    expect(html).toContain('Basic Pack')
    expect(html).toContain('50 tokens - £9.99')
    expect(html).toContain('Pro Pack')
    expect(html).toContain('150 tokens - £24.99')
    expect(html).toContain('Power Pack')
    expect(html).toContain('500 tokens - £69.99')
  })

  it('mention subscription plans', async () => {
    const html = await render(<LowBalanceEmail {...defaultProps} />)

    expect(html).toContain('consider a subscription plan')
    expect(html).toContain('unlimited enhancements')
    expect(html).toContain('automatic token refills')
  })

  it('include view pricing button', async () => {
    const html = await render(<LowBalanceEmail {...defaultProps} />)

    expect(html).toContain('View Pricing')
    expect(html).toContain('https://spike.land/pricing')
  })

  it('include account dashboard link', async () => {
    const html = await render(<LowBalanceEmail {...defaultProps} />)

    expect(html).toContain('account dashboard')
    expect(html).toContain('https://spike.land/account/tokens')
  })

  it('include team signature', async () => {
    const html = await render(<LowBalanceEmail {...defaultProps} />)

    expect(html).toContain('Thank you for using Spike Land!')
    expect(html).toContain('The Spike Land Team')
  })

  it('include unsubscribe link when provided', async () => {
    const html = await render(
      <LowBalanceEmail
        {...defaultProps}
        unsubscribeUrl="https://spike.land/unsubscribe?token=abc123"
      />
    )

    expect(html).toContain('Unsubscribe')
    expect(html).toContain('https://spike.land/unsubscribe?token=abc123')
  })

  it('not include unsubscribe link when not provided', async () => {
    const html = await render(<LowBalanceEmail {...defaultProps} />)

    // Should not contain unsubscribe in main content (only in base footer if provided)
    expect(html).not.toContain('Unsubscribe')
  })

  it('handle balance of 0', async () => {
    const html = await render(<LowBalanceEmail {...defaultProps} currentBalance={0} />)

    expect(html).toContain('0')
    expect(html).toContain('token')
    expect(html).toContain('remaining')
  })

  it('handle balance of 4 or less (trigger threshold)', async () => {
    const html = await render(<LowBalanceEmail {...defaultProps} currentBalance={4} />)

    expect(html).toContain('4')
    expect(html).toContain('token')
    expect(html).toContain('remaining')
    expect(html).toContain('running low')
  })
})
