'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TOKEN_PACKAGES, SUBSCRIPTION_PLANS, ENHANCEMENT_COSTS } from '@/lib/stripe/client'
import type { TokenPackageId, SubscriptionPlanId } from '@/lib/stripe/client'

export default function PricingPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState<string | null>(null)

  const handlePurchase = async (packageId: TokenPackageId) => {
    if (!session) {
      window.location.href = '/?callbackUrl=/pricing'
      return
    }

    setLoading(packageId)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, mode: 'payment' }),
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout')
    } finally {
      setLoading(null)
    }
  }

  const handleSubscribe = async (planId: SubscriptionPlanId) => {
    if (!session) {
      window.location.href = '/?callbackUrl=/pricing'
      return
    }

    setLoading(planId)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, mode: 'subscription' }),
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Pricing</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get tokens to enhance your images with AI. Choose a one-time pack or subscribe for monthly savings.
        </p>
      </div>

      {/* Enhancement Costs Info */}
      <div className="max-w-2xl mx-auto mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Token Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{ENHANCEMENT_COSTS.TIER_1K}</div>
                <div className="text-sm text-muted-foreground">token for 1K</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{ENHANCEMENT_COSTS.TIER_2K}</div>
                <div className="text-sm text-muted-foreground">tokens for 2K</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{ENHANCEMENT_COSTS.TIER_4K}</div>
                <div className="text-sm text-muted-foreground">tokens for 4K</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Packs */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Token Packs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {(Object.entries(TOKEN_PACKAGES) as [TokenPackageId, typeof TOKEN_PACKAGES[TokenPackageId]][]).map(
            ([id, pkg]) => (
              <Card key={id} className={id === 'pro' ? 'border-primary' : ''}>
                <CardHeader>
                  {id === 'pro' && (
                    <Badge className="w-fit mb-2">Most Popular</Badge>
                  )}
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>{pkg.tokens} tokens</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    £{pkg.price.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    £{(pkg.price / pkg.tokens).toFixed(2)} per token
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={id === 'pro' ? 'default' : 'outline'}
                    disabled={loading === id || status === 'loading'}
                    onClick={() => handlePurchase(id)}
                  >
                    {loading === id ? 'Processing...' : 'Buy Now'}
                  </Button>
                </CardFooter>
              </Card>
            )
          )}
        </div>
      </div>

      {/* Subscription Plans */}
      <div>
        <h2 className="text-2xl font-bold text-center mb-8">Monthly Plans</h2>
        <p className="text-center text-muted-foreground mb-8">
          Save more with a subscription. Unused tokens roll over!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {(Object.entries(SUBSCRIPTION_PLANS) as [SubscriptionPlanId, typeof SUBSCRIPTION_PLANS[SubscriptionPlanId]][]).map(
            ([id, plan]) => (
              <Card key={id} className={id === 'creator' ? 'border-primary' : ''}>
                <CardHeader>
                  {id === 'creator' && (
                    <Badge className="w-fit mb-2">Best Value</Badge>
                  )}
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.tokensPerMonth} tokens/month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    £{plan.priceGBP.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    £{(plan.priceGBP / plan.tokensPerMonth).toFixed(2)} per token
                  </div>
                  <ul className="text-sm space-y-1">
                    <li>
                      {plan.maxRollover === 0
                        ? 'Unlimited token rollover'
                        : `Up to ${plan.maxRollover} token rollover`}
                    </li>
                    {id === 'creator' && <li>Priority processing</li>}
                    {id === 'studio' && (
                      <>
                        <li>Priority processing</li>
                        <li>API access</li>
                      </>
                    )}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={id === 'creator' ? 'default' : 'outline'}
                    disabled={loading === id || status === 'loading'}
                    onClick={() => handleSubscribe(id)}
                  >
                    {loading === id ? 'Processing...' : 'Subscribe'}
                  </Button>
                </CardFooter>
              </Card>
            )
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">FAQ</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">What are tokens used for?</h3>
            <p className="text-muted-foreground">
              Tokens are used to enhance your images with AI. Higher resolution enhancements cost more tokens.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Do tokens expire?</h3>
            <p className="text-muted-foreground">
              Purchased tokens never expire. Subscription tokens roll over to the next month (up to your plan limit).
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Can I cancel my subscription?</h3>
            <p className="text-muted-foreground">
              Yes, you can cancel anytime. You will keep access until the end of your billing period.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
