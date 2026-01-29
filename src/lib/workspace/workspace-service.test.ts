import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceService } from './workspace-service';

// Mock Prisma
const mockCount = vi.fn();
const mockFindUnique = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/prisma', () => ({
  default: {
    workspaceMember: {
      count: (...args: any[]) => mockCount(...args),
    },
    workspace: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

describe('WorkspaceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('should throw error if workspace limit reached', async () => {
      mockCount.mockResolvedValue(10); // Limit is 10
      
      await expect(WorkspaceService.createWorkspace('user1', { name: 'New WS' }))
        .rejects.toThrow('Workspace limit reached');
        
      expect(mockCount).toHaveBeenCalledWith({
          where: { userId: 'user1', role: 'OWNER' }
      });
    });

    it('should create workspace with unique slug', async () => {
      mockCount.mockResolvedValue(2);
      
      // Slug collision simulation
      mockFindUnique
        .mockResolvedValueOnce({ id: 'existing' }) // first attempt collision
        .mockResolvedValueOnce(null); // second attempt success

      mockTransaction.mockImplementation(async (callback) => {
          // Mock transaction context
          const txMock = {
              workspace: { create: vi.fn().mockResolvedValue({ id: 'ws1', slug: 'new-ws-1' }) },
              workspaceMember: { create: vi.fn() }
          };
          return callback(txMock);
      });

      const result = await WorkspaceService.createWorkspace('user1', { name: 'New WS' });

      expect(result.slug).toBe('new-ws-1');
      expect(mockFindUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateSlug', () => {
      it('should return valid slug', () => {
          expect(WorkspaceService.generateSlug('My Workspace!')).toBe('my-workspace');
          expect(WorkspaceService.generateSlug('  Trim Me  ')).toBe('trim-me');
      });
  });
});
