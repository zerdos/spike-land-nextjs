
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Mocks
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    workspaceMember: { findUnique: vi.fn() },
    socialAccount: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/crypto/token-encryption', () => ({
  safeDecryptToken: vi.fn((t) => t),
}));

vi.mock('@/lib/social/youtube/resumable-uploader', () => {
  return {
    YouTubeResumableUploader: class {
      initiate = vi.fn().mockResolvedValue({ uploadUrl: 'http://test', sessionId: 'sess1' });
    }
  }
});

describe('POST /api/social/youtube/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if unauthorized', async () => {
    (auth as any).mockResolvedValue(null);
    const req = new NextRequest('http://localhost', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should return 400 if missing fields', async () => {
    (auth as any).mockResolvedValue({ user: { id: 'user1' } });
    const req = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should initiate upload if authorized', async () => {
    (auth as any).mockResolvedValue({ user: { id: 'user1' } });
    (prisma.workspaceMember.findUnique as any).mockResolvedValue({ id: 'member1' });
    (prisma.socialAccount.findFirst as any).mockResolvedValue({ accessTokenEncrypted: 'token' });

    const req = new NextRequest('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
            workspaceId: 'ws1',
            accountId: 'acc1',
            metadata: { title: 'Video' },
            fileSize: 1000
        }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.uploadUrl).toBe('http://test');
    expect(data.sessionId).toBe('sess1');
  });
});
