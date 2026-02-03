import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerBoxProvisioning } from './provisioning';
import prisma from '@/lib/prisma';
import { triggerWorkflowManually } from '@/lib/workflows/workflow-executor';
import { BoxStatus } from "@prisma/client";

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    box: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    workflow: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/workflows/workflow-executor', () => ({
  triggerWorkflowManually: vi.fn(),
}));

describe('triggerBoxProvisioning', () => {
  const mockBox = {
    id: 'box-123',
    userId: 'user-123',
    tier: { id: 'tier-1', name: 'Pro' },
    user: {
      workspaceMembers: [
        {
          workspace: {
            id: 'ws-1',
            isPersonal: true,
          },
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BOX_PROVISIONING_WEBHOOK_URL;
    delete process.env.BOX_PROVISIONING_SECRET;
  });

  it('should trigger webhook if ENV var is set', async () => {
    process.env.BOX_PROVISIONING_WEBHOOK_URL = 'https://example.com/provision';
    process.env.BOX_PROVISIONING_SECRET = 'secret';

    vi.mocked(prisma.box.findUnique).mockResolvedValue(mockBox as any);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await triggerBoxProvisioning('box-123');

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/provision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer secret',
      },
      body: JSON.stringify({
        boxId: 'box-123',
        userId: 'user-123',
        tier: mockBox.tier,
        action: 'PROVISION',
      }),
    });

    expect(triggerWorkflowManually).not.toHaveBeenCalled();
    expect(prisma.box.update).not.toHaveBeenCalled();
  });

  it('should set status to ERROR if webhook fails', async () => {
    process.env.BOX_PROVISIONING_WEBHOOK_URL = 'https://example.com/provision';

    vi.mocked(prisma.box.findUnique).mockResolvedValue(mockBox as any);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await triggerBoxProvisioning('box-123');

    expect(prisma.box.update).toHaveBeenCalledWith({
      where: { id: 'box-123' },
      data: { status: BoxStatus.ERROR },
    });
  });

  it('should trigger workflow if ENV var is NOT set and workflow exists', async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue(mockBox as any);
    vi.mocked(prisma.workflow.findFirst).mockResolvedValue({
      id: 'wf-1',
      name: 'Provision Box',
      status: 'ACTIVE',
    } as any);

    await triggerBoxProvisioning('box-123');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.workflow.findFirst).toHaveBeenCalledWith({
      where: {
        workspaceId: 'ws-1',
        name: 'Provision Box',
        status: 'ACTIVE',
      },
    });
    expect(triggerWorkflowManually).toHaveBeenCalledWith('wf-1', 'ws-1', {
      boxId: 'box-123',
      userId: 'user-123',
      tier: mockBox.tier,
    });
    expect(prisma.box.update).not.toHaveBeenCalled();
  });

  it('should set status to ERROR if workflow trigger fails', async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue(mockBox as any);
    vi.mocked(prisma.workflow.findFirst).mockResolvedValue({
      id: 'wf-1',
      name: 'Provision Box',
      status: 'ACTIVE',
    } as any);
    vi.mocked(triggerWorkflowManually).mockRejectedValue(new Error('Workflow failed'));

    await triggerBoxProvisioning('box-123');

    expect(prisma.box.update).toHaveBeenCalledWith({
      where: { id: 'box-123' },
      data: { status: BoxStatus.ERROR },
    });
  });

  it('should do nothing if box is not found', async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue(null);

    await triggerBoxProvisioning('box-123');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(triggerWorkflowManually).not.toHaveBeenCalled();
    expect(prisma.box.update).not.toHaveBeenCalled();
  });

  it('should set status to ERROR if neither webhook nor workflow is found', async () => {
    vi.mocked(prisma.box.findUnique).mockResolvedValue(mockBox as any);
    vi.mocked(prisma.workflow.findFirst).mockResolvedValue(null);

    await triggerBoxProvisioning('box-123');

    expect(prisma.box.update).toHaveBeenCalledWith({
      where: { id: 'box-123' },
      data: { status: BoxStatus.ERROR },
    });
  });
});
