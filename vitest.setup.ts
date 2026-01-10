
import { loadEnvConfig } from '@next/env';
import { vi } from 'vitest';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

vi.mock('@/lib/prisma', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
            },
        },
    });
    return { prisma };
});
