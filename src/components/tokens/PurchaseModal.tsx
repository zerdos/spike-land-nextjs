'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PackageCard } from './PackageCard'
import { VoucherInput } from './VoucherInput'
import { TOKEN_PACKAGES } from '@/lib/stripe/client'
import { Coins } from 'lucide-react'

interface PurchaseModalProps {
  trigger?: React.ReactNode
  onPurchaseComplete?: () => void
}

export function PurchaseModal({ trigger, onPurchaseComplete }: PurchaseModalProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const packages = Object.entries(TOKEN_PACKAGES).map(([id, pkg]) => ({
    id,
    ...pkg,
    popular: id === 'basic'
  }))

  const handlePurchase = async (packageId: string) => {
    setIsLoading(packageId)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          mode: 'payment',
        })
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const handleVoucherRedeemed = () => {
    setOpen(false)
    onPurchaseComplete?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Coins className="mr-2 h-4 w-4" />
            Get Tokens
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Get More Tokens</DialogTitle>
          <DialogDescription>
            Choose a token package or redeem a voucher code
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <VoucherInput onRedeemed={handleVoucherRedeemed} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or purchase tokens
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                id={pkg.id}
                name={pkg.name}
                tokens={pkg.tokens}
                price={pkg.priceGBP}
                popular={pkg.popular}
                onSelect={handlePurchase}
                isLoading={isLoading === pkg.id}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
