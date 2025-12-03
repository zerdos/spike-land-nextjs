import { Link, Text, Section } from '@react-email/components'
import * as React from 'react'
import { BaseEmail, emailStyles } from './base'

interface WelcomeEmailProps {
  userName?: string
  userEmail: string
}

export function WelcomeEmail({ userName, userEmail }: WelcomeEmailProps) {
  const displayName = userName || userEmail.split('@')[0]

  return (
    <BaseEmail
      preview="Welcome to Spike Land - Start enhancing your images with AI"
      heading={`Welcome to Spike Land, ${displayName}!`}
    >
      <Text style={emailStyles.text}>
        Thank you for joining Spike Land, the AI-powered image enhancement
        platform. We're excited to help you transform your images with
        cutting-edge AI technology.
      </Text>

      <Section style={emailStyles.success}>
        <Text style={emailStyles.successText}>
          Your account is ready! You've received 5 free tokens to get started.
        </Text>
      </Section>

      <Text style={emailStyles.text}>Here's what you can do with Spike Land:</Text>

      <Text style={emailStyles.text}>
        ✨ <strong>Enhance Images</strong> - Improve quality and resolution
        <br />
        🎨 <strong>AI-Powered Edits</strong> - Smart adjustments and filters
        <br />
        📸 <strong>Multiple Formats</strong> - Support for JPG, PNG, WebP, and more
        <br />
        ⚡ <strong>Fast Processing</strong> - Get results in seconds
      </Text>

      <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
        <Link href="https://spike.land/dashboard" style={emailStyles.button}>
          Start Enhancing Images
        </Link>
      </Section>

      <Text style={emailStyles.text}>
        Need help getting started? Check out our{' '}
        <Link href="https://spike.land/docs" style={emailStyles.link}>
          documentation
        </Link>{' '}
        or{' '}
        <Link href="https://spike.land/support" style={emailStyles.link}>
          contact support
        </Link>
        .
      </Text>

      <Text style={emailStyles.text}>
        Happy enhancing!
        <br />
        The Spike Land Team
      </Text>
    </BaseEmail>
  )
}
