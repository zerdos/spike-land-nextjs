import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientPortalService } from './client-portal-service';
import { getClientAccess } from '@/lib/permissions/client-permissions';

// Mock permissions
vi.mock('@/lib/permissions/client-permissions', () => ({
  getClientAccess: vi.fn(),
}));

describe('ClientPortalService', () => {
  let service: ClientPortalService;

  beforeEach(() => {
    service = new ClientPortalService();
    vi.clearAllMocks();
  });

  it('should return null if inputs are missing', async () => {
    expect(await service.getPortalAccess('', 'user1')).toBeNull();
    expect(await service.getPortalAccess('ws1', '')).toBeNull();
  });

  it('should delegate to getClientAccess', async () => {
    (getClientAccess as any).mockResolvedValue({ canViewContent: true });
    
    const result = await service.getPortalAccess('ws1', 'user1');
    
    expect(getClientAccess).toHaveBeenCalledWith('user1', 'ws1');
    expect(result).toEqual({ canViewContent: true });
  });

  it('should verify token validity (stub)', async () => {
      expect(await service.verifyMagicLinkToken('')).toBe(false);
      expect(await service.verifyMagicLinkToken('short')).toBe(false);
  });
});
