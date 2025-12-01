import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getStripe, TOKEN_PACKAGES, SUBSCRIPTION_PLANS } from '@/lib/stripe/client'
import type { TokenPackageId, SubscriptionPlanId } from '@/lib/stripe/client'
import prisma from '@/lib/prisma'

interface CheckoutRequest {
  packageId?: TokenPackageId
  planId?: SubscriptionPlanId
  mode: 'payment' | 'subscription'
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe()

    const session = await auth()
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CheckoutRequest = await request.json()
    const { packageId, planId, mode } = body

    if (mode === 'payment' && !packageId) {
      return NextResponse.json({ error: 'Package ID required for payment' }, { status: 400 })
    }

    if (mode === 'subscription' && !planId) {
      return NextResponse.json({ error: 'Plan ID required for subscription' }, { status: 400 })
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true, email: true, name: true },
    })

    let stripeCustomerId = user?.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: {
          userId: session.user.id,
        },
      })
      stripeCustomerId = customer.id

      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId },
      })
    }

    // Build checkout session based on mode
    const origin = request.headers.get('origin') || 'http://localhost:3000'

    if (mode === 'payment' && packageId) {
      const pkg = TOKEN_PACKAGES[packageId]
      if (!pkg) {
        return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 })
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: pkg.name,
                description: `${pkg.tokens} tokens for AI image enhancement`,
              },
              unit_amount: Math.round(pkg.priceGBP * 100), // Convert to pence
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: session.user.id,
          packageId,
          tokens: pkg.tokens.toString(),
          type: 'token_purchase',
        },
        success_url: `${origin}/settings/tokens?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing?canceled=true`,
      })

      return NextResponse.json({
        success: true,
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      })
    }

    if (mode === 'subscription' && planId) {
      const plan = SUBSCRIPTION_PLANS[planId]
      if (!plan) {
        return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 })
      }

      // Check if user already has an active subscription
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id },
      })

      if (existingSubscription && existingSubscription.status === 'ACTIVE') {
        return NextResponse.json(
          { error: 'You already have an active subscription. Please cancel it first.' },
          { status: 400 }
        )
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: `${plan.name} Plan`,
                description: `${plan.tokensPerMonth} tokens/month for AI image enhancement`,
              },
              unit_amount: Math.round(plan.priceGBP * 100),
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: session.user.id,
          planId,
          tokensPerMonth: plan.tokensPerMonth.toString(),
          maxRollover: plan.maxRollover.toString(),
          type: 'subscription',
        },
        success_url: `${origin}/settings/tokens?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing?canceled=true`,
      })

      return NextResponse.json({
        success: true,
        sessionId: checkoutSession.id,
        url: checkoutSession.url,
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
