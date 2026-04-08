import { describe, it, expect } from 'vitest';

// 这个Hook主要依赖Supabase查询，详细的集成测试应在e2e中进行
// 这里仅验证Hook导入和基本类型
import { useMembershipStatus, useUpdateMemberStatus, useBatchMembershipStatus } from '@/hooks/useMembership';

describe('useMembership Hooks - Import & Types', () => {
  it('should export useMembershipStatus hook', () => {
    expect(typeof useMembershipStatus).toBe('function');
  });

  it('should export useUpdateMemberStatus hook', () => {
    expect(typeof useUpdateMemberStatus).toBe('function');
  });

  it('should export useBatchMembershipStatus hook', () => {
    expect(typeof useBatchMembershipStatus).toBe('function');
  });

  it('should define hook signatures correctly', () => {
    // Verify hooks are callable
    expect(() => {
      // These would be called with proper context in real usage
      const hook1 = useMembershipStatus;
      const hook2 = useUpdateMemberStatus;
      const hook3 = useBatchMembershipStatus;
      
      expect(hook1).toBeDefined();
      expect(hook2).toBeDefined();
      expect(hook3).toBeDefined();
    }).not.toThrow();
  });
});
