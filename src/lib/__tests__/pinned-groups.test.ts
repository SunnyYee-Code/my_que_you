import { describe, it, expect } from 'vitest';
import {
  computePinnedDisplay,
  isGroupPinned,
  getPinnedBadgeLabel,
  getPinnedBadgeStyle,
  validatePinningOperation,
  sortGroupsByPinned,
  type GroupWithPinnedStatus,
} from '@/lib/pinned-groups';

describe('pinned-groups', () => {
  const mockPinnedGroup: GroupWithPinnedStatus = {
    id: 'g1',
    is_pinned: true,
    pinned_at: '2026-04-08T10:00:00Z',
    created_at: '2026-04-07T10:00:00Z',
  };

  const mockUnpinnedGroup: GroupWithPinnedStatus = {
    id: 'g2',
    is_pinned: false,
    pinned_at: null,
    created_at: '2026-04-08T09:00:00Z',
  };

  describe('computePinnedDisplay', () => {
    it('should compute display info for pinned group', () => {
      const result = computePinnedDisplay(mockPinnedGroup);
      expect(result.isPinned).toBe(true);
      expect(result.pinnedAt).toBe('2026-04-08T10:00:00Z');
      expect(result.sortPriority).toBe(0);
    });

    it('should compute display info for unpinned group', () => {
      const result = computePinnedDisplay(mockUnpinnedGroup);
      expect(result.isPinned).toBe(false);
      expect(result.pinnedAt).toBeNull();
      expect(result.sortPriority).toBe(1);
    });

    it('should handle null is_pinned field', () => {
      const group: GroupWithPinnedStatus = {
        ...mockUnpinnedGroup,
        is_pinned: null as any,
      };
      const result = computePinnedDisplay(group);
      expect(result.isPinned).toBe(false);
      expect(result.sortPriority).toBe(1);
    });
  });

  describe('isGroupPinned', () => {
    it('should return true for pinned group', () => {
      expect(isGroupPinned(mockPinnedGroup)).toBe(true);
    });

    it('should return false for unpinned group', () => {
      expect(isGroupPinned(mockUnpinnedGroup)).toBe(false);
    });
  });

  describe('getPinnedBadgeLabel', () => {
    it('should return pinned badge label', () => {
      expect(getPinnedBadgeLabel()).toBe('精选');
    });
  });

  describe('getPinnedBadgeStyle', () => {
    it('should return premium style', () => {
      expect(getPinnedBadgeStyle()).toBe('premium');
    });
  });

  describe('validatePinningOperation', () => {
    it('should reject non-super-admin', () => {
      const result = validatePinningOperation(false, 'g1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('super admin');
    });

    it('should reject missing group ID', () => {
      const result = validatePinningOperation(true, undefined);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Group ID');
    });

    it('should accept valid super admin with group ID', () => {
      const result = validatePinningOperation(true, 'g1');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('sortGroupsByPinned', () => {
    it('should sort pinned groups first', () => {
      const groups = [mockUnpinnedGroup, mockPinnedGroup];
      const sorted = sortGroupsByPinned(groups);
      expect(sorted[0].is_pinned).toBe(true);
      expect(sorted[1].is_pinned).toBe(false);
    });

    it('should sort pinned groups by pinned_at descending', () => {
      const older: GroupWithPinnedStatus = {
        id: 'g3',
        is_pinned: true,
        pinned_at: '2026-04-08T09:00:00Z',
        created_at: '2026-04-07T09:00:00Z',
      };
      const newer: GroupWithPinnedStatus = {
        id: 'g4',
        is_pinned: true,
        pinned_at: '2026-04-08T11:00:00Z',
        created_at: '2026-04-07T11:00:00Z',
      };
      const sorted = sortGroupsByPinned([older, newer]);
      expect(sorted[0].id).toBe('g4'); // Newer pinned first
      expect(sorted[1].id).toBe('g3');
    });

    it('should sort unpinned groups by created_at descending', () => {
      const older: GroupWithPinnedStatus = {
        id: 'g5',
        is_pinned: false,
        pinned_at: null,
        created_at: '2026-04-08T08:00:00Z',
      };
      const newer: GroupWithPinnedStatus = {
        id: 'g6',
        is_pinned: false,
        pinned_at: null,
        created_at: '2026-04-08T09:00:00Z',
      };
      const sorted = sortGroupsByPinned([older, newer]);
      expect(sorted[0].id).toBe('g6'); // Newer unpinned first
      expect(sorted[1].id).toBe('g5');
    });

    it('should maintain correct order with mixed pinned/unpinned', () => {
      const groups = [
        mockUnpinnedGroup,
        mockPinnedGroup,
        {
          id: 'g7',
          is_pinned: false,
          pinned_at: null,
          created_at: '2026-04-08T10:00:00Z',
        },
      ];
      const sorted = sortGroupsByPinned(groups);
      expect(sorted[0].is_pinned).toBe(true);
      expect(sorted[1].is_pinned).toBe(false);
      expect(sorted[1].id).toBe('g7'); // Newer unpinned first
      expect(sorted[2].is_pinned).toBe(false);
      expect(sorted[2].id).toBe('g2');
    });
  });
});
