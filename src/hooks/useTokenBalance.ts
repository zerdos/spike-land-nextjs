import { useState, useEffect, useCallback } from 'react'

export interface TokenBalanceData {
  balance: number
  lastRegeneration: string
  timeUntilNextRegenMs: number
  tokensAddedThisRequest: number
  stats: {
    totalSpent: number
    totalEarned: number
    totalRefunded: number
    transactionCount: number
  }
}

export interface UseTokenBalanceResult {
  balance: TokenBalanceData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTokenBalance(
  autoRefetch = true,
  interval = 60000
): UseTokenBalanceResult {
  const [balance, setBalance] = useState<TokenBalanceData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/tokens/balance')

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized')
        }
        throw new Error(`Failed to fetch balance: ${response.statusText}`)
      }

      const data = await response.json()
      setBalance(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBalance()

    if (!autoRefetch) return

    const intervalId = setInterval(fetchBalance, interval)

    return () => clearInterval(intervalId)
  }, [fetchBalance, autoRefetch, interval])

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  }
}
