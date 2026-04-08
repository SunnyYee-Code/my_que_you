/**
 * Pinned Groups Utility Library
 *
 * Handles logic for pinned/featured groups in V3 增值曝光 feature.
 * Pinning is admin-controlled only (no user self-service purchasing in V3).
 *
 * Sorting Rule:
 * 1. Pinned groups (is_pinned=true) come first
 * 2. Within pinned groups: sorted by pinned_at DESC (newest first)
 * 3. Within unpinned groups: sorted by created_at DESC (newest first)
 */

export interface PinnedGroupDisplay {
  isPinned: boolean;
  pinnedAt: string | null;
  sortPriority: number; // 0 for pinned, 1 for unpinned (for sorting)
}

export interface GroupWithPinnedStatus {
  id: string;
  is_pinned: boolean;
  pinned_at: string | null;
  created_at: string;
}

/**
 * Compute sort priority and pinned display info for a group
 */
export function computePinnedDisplay(group: GroupWithPinnedStatus): PinnedGroupDisplay {
  return {
    isPinned: group.is_pinned ?? false,
    pinnedAt: group.pinned_at ?? null,
    sortPriority: (group.is_pinned ?? false) ? 0 : 1,
  };
}

/**
 * Check if a group is currently pinned
 */
export function isGroupPinned(group: GroupWithPinnedStatus): boolean {
  return group.is_pinned ?? false;
}

/**
 * Format pinned badge label
 */
export function getPinnedBadgeLabel(): string {
  return '精选';
}

/**
 * Get pinned badge color/style
 */
export function getPinnedBadgeStyle(): 'premium' | 'featured' {
  return 'premium'; // Use premium styling for visual emphasis
}

/**
 * Validate admin pinning operation
 * (V3: basic validation; no payment verification needed)
 */
export function validatePinningOperation(
  isSuperAdmin: boolean,
  groupId?: string
): { isValid: boolean; error?: string } {
  if (!isSuperAdmin) {
    return { isValid: false, error: 'Only super admins can pin groups' };
  }

  if (!groupId) {
    return { isValid: false, error: 'Group ID is required' };
  }

  return { isValid: true };
}

/**
 * Documentation: Sorting Rules for Groups List
 *
 * In useGroupsByCity and similar list queries:
 *
 * Frontend sorting (after fetching from Supabase):
 * ```
 * const sorted = groups.sort((a, b) => {
 *   // Pinned groups first
 *   const aPinned = computePinnedDisplay(a).sortPriority;
 *   const bPinned = computePinnedDisplay(b).sortPriority;
 *   if (aPinned !== bPinned) return aPinned - bPinned;
 *
 *   // Within same pinned status, sort by timestamp descending
 *   const aTime = a.is_pinned ? (a.pinned_at ?? a.created_at) : a.created_at;
 *   const bTime = b.is_pinned ? (b.pinned_at ?? b.created_at) : b.created_at;
 *   return new Date(bTime).getTime() - new Date(aTime).getTime();
 * });
 * ```
 *
 * Backend sorting (in useGroupsByCity query):
 * Uses index: idx_groups_pinned_order (is_pinned DESC, created_at DESC)
 * This provides base ordering; frontend can further customize if needed.
 */

/**
 * Apply sorting logic to groups array
 */
export function sortGroupsByPinned(groups: GroupWithPinnedStatus[]): GroupWithPinnedStatus[] {
  return groups.sort((a, b) => {
    // Pinned first
    const aPinned = computePinnedDisplay(a).sortPriority;
    const bPinned = computePinnedDisplay(b).sortPriority;
    if (aPinned !== bPinned) return aPinned - bPinned;

    // Within same pinned status, newer first
    const aTime = a.is_pinned ? (a.pinned_at ?? a.created_at) : a.created_at;
    const bTime = b.is_pinned ? (b.pinned_at ?? b.created_at) : b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

/**
 * Export types for RLS and admin operations
 */
export const PINNED_GROUPS_ADMIN_ROLE = 'super_admin'; // Only super admins can manage pinning
export const PINNED_GROUPS_V3_FEATURE = 'pinned-groups-v3'; // Feature flag
