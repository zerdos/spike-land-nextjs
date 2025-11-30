'use client'

import { useTokenBalance } from '@/hooks/useTokenBalance'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Coins, RefreshCw } from 'lucide-react'

export function TokenBalanceDisplay() {
  const { balance, isLoading, error, refetch } = useTokenBalance()

  if (error) {
    return (
      <Card className="p-4 bg-destructive/10 border-destructive/20">
        <p className="text-sm text-destructive">Failed to load balance</p>
      </Card>
    )
  }

  if (isLoading && !balance) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </Card>
    )
  }

  const timeUntilNextMin = balance
    ? Math.ceil(balance.timeUntilNextRegenMs / 60000)
    : 0

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{balance?.balance ?? 0}</span>
                <span className="text-sm text-muted-foreground">tokens</span>
              </div>
              {balance && balance.timeUntilNextRegenMs > 0 && (
                <p className="text-xs text-muted-foreground">
                  Next regeneration in {timeUntilNextMin}m
                </p>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </Card>
  )
}
