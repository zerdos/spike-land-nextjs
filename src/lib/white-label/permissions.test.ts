import { describe, it, expect } from 'vitest';
import { canAccessWhiteLabel, canConfigureWhiteLabel, canConfigureDomain, canDeleteWhiteLabelConfig, getWhiteLabelTiers, getWhiteLabelPermissionMessage, getWhiteLabelTierMessage } from './permissions';
import type { Workspace, WorkspaceMember } from '@/generated/prisma';

// Helper to create mock objects
const createWorkspace = (tier: string): Pick<Workspace, 'subscriptionTier'> => ({
    subscriptionTier: tier as any
});

const createMember = (role: string): Pick<WorkspaceMember, 'role'> => ({
    role: role as any
});

describe('White Label Permissions', () => {
    describe('canAccessWhiteLabel', () => {
        it('should allow PRO and BUSINESS tiers', () => {
            expect(canAccessWhiteLabel(createWorkspace('PRO'))).toBe(true);
            expect(canAccessWhiteLabel(createWorkspace('BUSINESS'))).toBe(true);
        });

        it('should deny FREE tier', () => {
            expect(canAccessWhiteLabel(createWorkspace('FREE'))).toBe(false);
        });
    });

    describe('canConfigureWhiteLabel', () => {
        it('should deny if workspace has no access', () => {
             // PRO/OWNER -> Allow
             expect(canConfigureWhiteLabel(createWorkspace('PRO'), createMember('OWNER'))).toBe(true);
             // FREE/OWNER -> Deny
             expect(canConfigureWhiteLabel(createWorkspace('FREE'), createMember('OWNER'))).toBe(false);
        });

        it('should allow OWNER and ADMIN roles', () => {
            const ws = createWorkspace('PRO');
            expect(canConfigureWhiteLabel(ws, createMember('OWNER'))).toBe(true);
            expect(canConfigureWhiteLabel(ws, createMember('ADMIN'))).toBe(true);
        });

        it('should deny MEMBER and VIEWER roles', () => {
            const ws = createWorkspace('PRO');
            expect(canConfigureWhiteLabel(ws, createMember('MEMBER'))).toBe(false);
            expect(canConfigureWhiteLabel(ws, createMember('VIEWER'))).toBe(false); // Assuming VIEWER exists or fallback
        });
    });

    describe('canConfigureDomain', () => {
        it('should behave same as canConfigureWhiteLabel', () => {
            const ws = createWorkspace('PRO');
            const member = createMember('OWNER');
            expect(canConfigureDomain(ws, member)).toBe(true);
        });
    });

    describe('canDeleteWhiteLabelConfig', () => {
        it('should only allow OWNER', () => {
            expect(canDeleteWhiteLabelConfig(createMember('OWNER'))).toBe(true);
            expect(canDeleteWhiteLabelConfig(createMember('ADMIN'))).toBe(false);
            expect(canDeleteWhiteLabelConfig(createMember('MEMBER'))).toBe(false);
        });
    });

    describe('Helpers', () => {
        it('getWhiteLabelTiers returns correct tiers', () => {
            expect(getWhiteLabelTiers()).toEqual(['PRO', 'BUSINESS']);
        });

        it('getWhiteLabelTierMessage returns string', () => {
            expect(getWhiteLabelTierMessage()).toBeTruthy();
        });

        it('getWhiteLabelPermissionMessage returns string', () => {
            expect(getWhiteLabelPermissionMessage()).toBeTruthy();
        });
    });
});
