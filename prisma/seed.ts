import { PrismaClient } from '@/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Example: Create a test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: new Date(),
    },
  })

  console.log('Created test user:', testUser)

  // Example: Create sample apps
  const sampleApps = await Promise.all([
    prisma.app.upsert({
      where: { id: 'sample-app-1' },
      update: {},
      create: {
        id: 'sample-app-1',
        name: 'Todo App',
        description: 'A simple todo application',
        userId: testUser.id,
        status: 'ACTIVE',
        requirements: {
          create: [
            {
              description: 'User can add new tasks',
              priority: 'HIGH',
              status: 'COMPLETED',
            },
            {
              description: 'User can mark tasks as complete',
              priority: 'HIGH',
              status: 'COMPLETED',
            },
            {
              description: 'User can filter tasks by status',
              priority: 'MEDIUM',
              status: 'IN_PROGRESS',
            },
          ],
        },
        monetizationModels: {
          create: {
            type: 'FREE',
            features: ['Basic task management', 'Up to 10 tasks'],
          },
        },
      },
    }),
    prisma.app.upsert({
      where: { id: 'sample-app-2' },
      update: {},
      create: {
        id: 'sample-app-2',
        name: 'Note Taking App',
        description: 'A feature-rich note taking application',
        userId: testUser.id,
        status: 'DRAFT',
        requirements: {
          create: [
            {
              description: 'Rich text editor support',
              priority: 'CRITICAL',
              status: 'IN_PROGRESS',
            },
            {
              description: 'Markdown support',
              priority: 'HIGH',
              status: 'PENDING',
            },
          ],
        },
        monetizationModels: {
          create: [
            {
              type: 'FREEMIUM',
              features: ['Up to 5 notes', 'Basic formatting'],
            },
            {
              type: 'SUBSCRIPTION',
              price: 9.99,
              subscriptionInterval: 'MONTHLY',
              features: [
                'Unlimited notes',
                'Advanced formatting',
                'Cloud sync',
                'Collaboration',
              ],
            },
          ],
        },
      },
    }),
  ])

  console.log('Created sample apps:', sampleApps.length)

  console.log('Database seed completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error during database seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
