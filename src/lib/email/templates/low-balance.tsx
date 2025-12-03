import { Link, Text, Section } from '@react-email/components'
import * as React from 'react'
import { BaseEmail, emailStyles } from './base'

interface LowBalanceEmailProps {
  userName?: string
  userEmail: string
  currentBalance: number
  unsubscribeUrl?: string
}

export function LowBalanceEmail({
  userName,
  userEmail,
  currentBalance,
  unsubscribeUrl,
}: LowBalanceEmailProps) {
  const displayName = userName || userEmail.split('@')[0]

  return (
    <BaseEmail
      preview="Your token balance is running low - Top up to continue enhancing"
      heading="Running Low on Tokens"
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={emailStyles.text}>Hi {displayName},</Text>

      <Text style={emailStyles.text}>
        This is a friendly reminder that your token balance is running low.
      </Text>

      <Section style={emailStyles.alert}>
        <Text style={emailStyles.alertText}>
          <strong>Current Balance:</strong> {currentBalance} token{currentBalance !== 1 ? 's' : ''} remaining
        </Text>
      </Section>

      <Text style={emailStyles.text}>
        You might want to purchase more tokens to continue enhancing your
        images without interruption. We offer various token packages to suit
        your needs:
      </Text>

      <Section
        style={{
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          padding: '24px',
          margin: '24px 0',
        }}
      >
        <Text style={{ ...emailStyles.text, margin: '8px 0' }}>
          🎯 <strong>Starter Pack:</strong> 10 tokens - £2.99
        </Text>
        <Text style={{ ...emailStyles.text, margin: '8px 0' }}>
          📦 <strong>Basic Pack:</strong> 50 tokens - £9.99
        </Text>
        <Text style={{ ...emailStyles.text, margin: '8px 0' }}>
          💼 <strong>Pro Pack:</strong> 150 tokens - £24.99
        </Text>
        <Text style={{ ...emailStyles.text, margin: '8px 0' }}>
          ⚡ <strong>Power Pack:</strong> 500 tokens - £69.99
        </Text>
      </Section>

      <Text style={emailStyles.text}>
        <strong>Or consider a subscription plan</strong> for unlimited
        enhancements and automatic token refills each month!
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Link href="https://spike.land/pricing" style={emailStyles.button}>
          View Pricing
        </Link>
      </Section>

      <Text style={emailStyles.text}>
        You can check your current balance and purchase tokens from your{' '}
        <Link href="https://spike.land/account/tokens" style={emailStyles.link}>
          account dashboard
        </Link>
        .
      </Text>

      <Text style={emailStyles.text}>
        Thank you for using Spike Land!
        <br />
        The Spike Land Team
      </Text>
    </BaseEmail>
  )
}
