import prisma from '../src/lib/prisma'
import { TokenBalanceManager } from '../src/lib/tokens/balance-manager'
import { TokenTransactionType } from '@prisma/client'

async function addTokens() {
  // Get the first user (the one logged in)
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  if (!user) {
    console.error('No user found')
    process.exit(1)
  }

  console.log(`Adding 1000 tokens to user: ${user.email} (${user.id})`)

  // Add 1000 tokens
  await TokenBalanceManager.addTokens({
    userId: user.id,
    amount: 1000,
    type: TokenTransactionType.EARN_REGENERATION,
    source: 'manual_grant',
    sourceId: 'admin-grant',
  })

  const balanceResult = await TokenBalanceManager.getBalance(user.id)
  console.log(`New balance: ${balanceResult.balance} tokens`)

  await prisma.$disconnect()
}

addTokens().catch((error) => {
  console.error('Error adding tokens:', error)
  process.exit(1)
})
