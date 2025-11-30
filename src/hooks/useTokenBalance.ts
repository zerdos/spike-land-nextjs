import { useEffect, useState } from 'react'

interface TokenBalance {
  balance: number
  lastRegeneration: string | null
}

export function useTokenBalance() {
  const [balance, setBalance] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchBalance = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/tokens/balance')
      if (!response.ok) {
        throw new Error('Failed to fetch token balance')
      }
      const data: TokenBalance = await response.json()
      setBalance(data.balance)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [])

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  }
}
