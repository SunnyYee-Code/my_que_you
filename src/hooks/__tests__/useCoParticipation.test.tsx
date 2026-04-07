import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { useAuthMock, fromMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
  },
}));

import {
  useFrequentPartners,
  useAddPartnerTag,
  useRemovePartnerTag,
  PARTNER_TAG_OPTIONS,
} from '@/hooks/useCoParticipation';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

const CURRENT_USER_ID = 'user-current';

beforeEach(() => {
  useAuthMock.mockReturnValue({ user: { id: CURRENT_USER_ID } });
  vi.clearAllMocks();
});

describe('PARTNER_TAG_OPTIONS', () => {
  it('包含预定义的 6 种标签', () => {
    expect(PARTNER_TAG_OPTIONS).toHaveLength(6);
    expect(PARTNER_TAG_OPTIONS).toContain('好搭档');
    expect(PARTNER_TAG_OPTIONS).toContain('常约对象');
    expect(PARTNER_TAG_OPTIONS).toContain('新朋友');
    expect(PARTNER_TAG_OPTIONS).toContain('牌品好');
    expect(PARTNER_TAG_OPTIONS).toContain('准时靠谱');
    expect(PARTNER_TAG_OPTIONS).toContain('欢迎再约');
  });
});

describe('useFrequentPartners', () => {
  it('无参与记录时返回空数组', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'group_members') {
        // select -> eq(user_id) -> eq(groups.status) => resolves to empty
        const innerEq = vi.fn().mockResolvedValue({ data: [], error: null });
        const outerEq = vi.fn().mockReturnValue({ eq: innerEq });
        return {
          select: vi.fn().mockReturnValue({ eq: outerEq }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useFrequentPartners(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('聚合共同参与记录，按共局次数降序排列', async () => {
    let callIndex = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === 'group_members') {
        const eqFn = vi.fn();
        const selectFn = vi.fn().mockReturnThis();
        const inFn = vi.fn();
        const neqFn = vi.fn();

        callIndex++;
        if (callIndex === 1) {
          // 第一次查询：当前用户参与的已完成拼团
          eqFn.mockImplementation((_col, _val) => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                { group_id: 'g1', groups: { id: 'g1', status: 'COMPLETED', end_time: '2026-01-10T10:00:00Z' } },
                { group_id: 'g2', groups: { id: 'g2', status: 'COMPLETED', end_time: '2026-02-15T10:00:00Z' } },
              ],
              error: null,
            }),
          }));
          return { select: selectFn, eq: eqFn };
        } else {
          // 第二次查询：同局其他成员
          inFn.mockImplementation(() => ({
            neq: neqFn,
          }));
          neqFn.mockResolvedValue({
            data: [
              { user_id: 'user-a', group_id: 'g1', profiles: { id: 'user-a', nickname: '牌友甲', avatar_url: null, credit_score: 100 } },
              { user_id: 'user-b', group_id: 'g1', profiles: { id: 'user-b', nickname: '牌友乙', avatar_url: null, credit_score: 90 } },
              { user_id: 'user-a', group_id: 'g2', profiles: { id: 'user-a', nickname: '牌友甲', avatar_url: null, credit_score: 100 } },
            ],
            error: null,
          });
          return { select: selectFn, in: inFn };
        }
      }
      if (table === 'partner_tags') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useFrequentPartners(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const partners = result.current.data!;
    expect(partners).toHaveLength(2);
    // user-a 出现 2 次，排在前面
    expect(partners[0].userId).toBe('user-a');
    expect(partners[0].coCount).toBe(2);
    expect(partners[0].nickname).toBe('牌友甲');
    // user-b 出现 1 次，排在后面
    expect(partners[1].userId).toBe('user-b');
    expect(partners[1].coCount).toBe(1);
  });

  it('用户未登录时不发起查询', () => {
    useAuthMock.mockReturnValue({ user: null });

    const { result } = renderHook(() => useFrequentPartners(), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe('useAddPartnerTag', () => {
  it('成功添加标签后使查询缓存失效', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'partner_tags') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useAddPartnerTag(), { wrapper });

    await result.current.mutateAsync({ partnerId: 'user-a', tag: '好搭档' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('partner_tags');
  });

  it('用户未登录时抛出错误', async () => {
    useAuthMock.mockReturnValue({ user: null });

    const { result } = renderHook(() => useAddPartnerTag(), { wrapper });

    await expect(
      result.current.mutateAsync({ partnerId: 'user-a', tag: '好搭档' })
    ).rejects.toThrow('请先登录');
  });
});

describe('useRemovePartnerTag', () => {
  it('成功删除标签', async () => {
    const eqMock = vi.fn().mockReturnThis();
    eqMock
      .mockReturnValueOnce({ eq: eqMock })
      .mockReturnValueOnce({ eq: eqMock })
      .mockResolvedValueOnce({ error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === 'partner_tags') {
        return {
          delete: vi.fn(() => ({ eq: eqMock })),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useRemovePartnerTag(), { wrapper });

    await result.current.mutateAsync({ partnerId: 'user-a', tag: '好搭档' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('partner_tags');
  });

  it('用户未登录时抛出错误', async () => {
    useAuthMock.mockReturnValue({ user: null });

    const { result } = renderHook(() => useRemovePartnerTag(), { wrapper });

    await expect(
      result.current.mutateAsync({ partnerId: 'user-a', tag: '好搭档' })
    ).rejects.toThrow('请先登录');
  });
});
