"use client"

import { Coins } from "lucide-react"
import { useTokenBalance } from "@/hooks/useTokenBalance"
import { Card, CardContent } from "@/components/ui/card"

export function TokenBalanceDisplay() {
  const { balance, isLoading } = useTokenBalance()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-4">
          <Coins className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-2 p-4">
        <Coins className="h-5 w-5 text-yellow-500" />
        <div>
          <p className="text-sm font-medium">{balance} tokens</p>
          <p className="text-xs text-muted-foreground">Available balance</p>
        </div>
      </CardContent>
    </Card>
  )
}
