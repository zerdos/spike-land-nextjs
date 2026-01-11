import { getPersonalWorkspaceId } from '@/lib/workspace.ts';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { vi } from 'vitest';

vi.mock('@/auth');
vi.mock('@/lib/prisma', () => ({
  default: {
    workspace: {
      findFirst: vi.fn(),
    },
  },
}));

describe('getPersonalWorkspaceId', () => {
  it('should return the workspace ID for a logged-in user', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'test-user-id' },
    } as any);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue({
      id: 'test-workspace-id',
    } as any);

    const workspaceId = await getPersonalWorkspaceId();
    expect(workspaceId).toBe('test-workspace-id');
  });

  it('should return null if the user is not logged in', async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const workspaceId = await getPersonalWorkspaceId();
    expect(workspaceId).toBeNull();
  });

  it('should return null if the user has no personal workspace', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'test-user-id' },
    } as any);
    vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

    const workspaceId = await getPersonalWorkspaceId();
    expect(workspaceId).toBeNull();
  });
});
