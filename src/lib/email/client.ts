import { Resend } from 'resend'

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null

export function getResend(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export interface SendEmailParams {
  to: string | string[]
  subject: string
  react: React.ReactElement
  from?: string
}

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Send an email using Resend
 *
 * Rate limiting considerations:
 * - Free tier: 100 emails/day
 * - Paid tier: Higher limits based on plan
 * - Consider implementing your own rate limiting wrapper if needed
 *
 * @param params Email parameters
 * @returns Result with success status and email ID or error
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const resend = getResend()
    const from = params.from || process.env.EMAIL_FROM || 'noreply@spike.land'

    const result = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      react: params.react,
    })

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      }
    }

    if (result.data && result.data.id) {
      return {
        success: true,
        id: result.data.id,
      }
    }

    return {
      success: false,
      error: 'Failed to send email - no ID returned',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
