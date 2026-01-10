
import { vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

const prismaMock = mockDeep();
export const prisma = prismaMock;
vi.mock('@/lib/prisma', () => ({
    prisma: prismaMock,
}));
