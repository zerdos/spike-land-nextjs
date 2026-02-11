import { PrismaClient } from './src/generated/prisma';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.user.count();
  console.log('User count:', count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
