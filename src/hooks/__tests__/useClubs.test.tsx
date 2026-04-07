import { renderHook, waitFor, act } from '@testing-library/react';
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
  useClubs,
  useMyClubs,
  useCreateClub,
  useJoinClub,
  useLeaveClub,
} from '@/hooks/useClubs';

import {
  validateClubName,
  validateClubDescription,
  validateAnnouncementContent,
  canManageClub,
  isActiveMember,
  charCountColor,
  roleName,
} from '@/lib/clubs';

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

// ─── lib/clubs 纯函数测试 ─────────────────────────────────────

describe('validateClubName', () => {
  it('名称长度不足 2 字符时返回错误', () => {
    expect(validateClubName('A')).not.toBeNull();
    expect(validateClubName('')).not.toBeNull();
  });

  it('名称超过 30 字符时返回错误', () => {
    expect(validateClubName('A'.repeat(31))).not.toBeNull();
  });

  it('合法名称返回 null', () => {
    expect(validateClubName('精英牌局')).toBeNull();
    expect(validateClubName('AB')).toBeNull();
    expect(validateClubName('A'.repeat(30))).toBeNull();
  });
});

describe('validateClubDescription', () => {
  it('超过 200 字符时返回错误', () => {
    expect(validateClubDescription('A'.repeat(201))).not.toBeNull();
  });

  it('200 字符以内返回 null', () => {
    expect(validateClubDescription('')).toBeNull();
    expect(validateClubDescription('A'.repeat(200))).toBeNull();
  });
});

describe('validateAnnouncementContent', () => {
  it('内容为空时返回错误', () => {
    expect(validateAnnouncementContent('')).not.toBeNull();
    expect(validateAnnouncementContent('   ')).not.toBeNull();
  });

  it('超过 500 字符时返回错误', () => {
    expect(validateAnnouncementContent('A'.repeat(501))).not.toBeNull();
  });

  it('合法内容返回 null', () => {
    expect(validateAnnouncementContent('通知：周六开局')).toBeNull();
  });
});

describe('canManageClub', () => {
  it('owner 和 admin 可以管理', () => {
    expect(canManageClub('owner')).toBe(true);
    expect(canManageClub('admin')).toBe(true);
  });

  it('普通成员和非成员无管理权限', () => {
    expect(canManageClub('member')).toBe(false);
    expect(canManageClub(null)).toBe(false);
  });
});

describe('isActiveMember', () => {
  it('active 状态返回 true', () => {
    expect(isActiveMember('active')).toBe(true);
  });

  it('其他状态返回 false', () => {
    expect(isActiveMember('pending')).toBe(false);
    expect(isActiveMember('banned')).toBe(false);
    expect(isActiveMember(null)).toBe(false);
  });
});

describe('charCountColor', () => {
  it('未达 70% 时返回 muted 颜色', () => {
    expect(charCountColor(50, 200)).toBe('text-muted-foreground');
  });

  it('达到 70% 时返回黄色警告', () => {
    expect(charCountColor(140, 200)).toBe('text-yellow-500');
  });

  it('达到 90% 时返回红色', () => {
    expect(charCountColor(180, 200)).toBe('text-destructive');
  });
});

describe('roleName', () => {
  it('返回正确的中文角色名称', () => {
    expect(roleName('owner')).toBe('创始人');
    expect(roleName('admin')).toBe('管理员');
    expect(roleName('member')).toBe('成员');
  });
});

// ─── useClubs hook 测试 ───────────────────────────────────────

describe('useClubs', () => {
  it('无俱乐部时返回空数组', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'clubs') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useClubs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('返回俱乐部列表并注入 myRole 信息', async () => {
    let callIndex = 0;
    fromMock.mockImplementation((table: string) => {
      callIndex++;
      if (table === 'clubs') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'club-1',
                name: '精英牌局',
                description: '高手专属',
                avatar_url: null,
                is_public: true,
                creator_id: 'user-a',
                member_count: 5,
                created_at: '2026-04-01T00:00:00Z',
                updated_at: '2026-04-01T00:00:00Z',
              },
            ],
            error: null,
          }),
        };
      }
      if (table === 'club_members') {
        // 批量查询当前用户的成员身份
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ club_id: 'club-1', role: 'member', status: 'active' }],
            error: null,
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useClubs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const clubs = result.current.data!;
    expect(clubs).toHaveLength(1);
    expect(clubs[0].id).toBe('club-1');
    expect(clubs[0].name).toBe('精英牌局');
    expect(clubs[0].myRole).toBe('member');
    expect(clubs[0].myStatus).toBe('active');
  });

  it('未登录时 myRole 为 null', async () => {
    useAuthMock.mockReturnValue({ user: null });

    fromMock.mockImplementation((table: string) => {
      if (table === 'clubs') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'club-1',
                name: '精英牌局',
                description: null,
                avatar_url: null,
                is_public: true,
                creator_id: 'user-a',
                member_count: 3,
                created_at: '2026-04-01T00:00:00Z',
                updated_at: '2026-04-01T00:00:00Z',
              },
            ],
            error: null,
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useClubs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].myRole).toBeNull();
  });
});

// ─── useMyClubs hook 测试 ─────────────────────────────────────

describe('useMyClubs', () => {
  it('未登录时不发起查询', () => {
    useAuthMock.mockReturnValue({ user: null });

    const { result } = renderHook(() => useMyClubs(), { wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('登录用户返回已加入的俱乐部', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === 'club_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                role: 'owner',
                status: 'active',
                clubs: {
                  id: 'club-2',
                  name: '麻将联盟',
                  description: '每周固定局',
                  avatar_url: null,
                  is_public: false,
                  creator_id: CURRENT_USER_ID,
                  member_count: 8,
                  created_at: '2026-03-01T00:00:00Z',
                  updated_at: '2026-03-01T00:00:00Z',
                },
              },
            ],
            error: null,
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useMyClubs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const clubs = result.current.data!;
    expect(clubs).toHaveLength(1);
    expect(clubs[0].id).toBe('club-2');
    expect(clubs[0].myRole).toBe('owner');
    expect(clubs[0].isPublic).toBe(false);
  });
});

// ─── useCreateClub hook 测试 ──────────────────────────────────

describe('useCreateClub', () => {
  it('成功创建俱乐部并自动加入为 owner', async () => {
    let insertCallCount = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === 'clubs') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'new-club-id' }, error: null }),
        };
      }
      if (table === 'club_members') {
        insertCallCount++;
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useCreateClub(), { wrapper });

    let clubId: string | undefined;
    await act(async () => {
      clubId = await result.current.mutateAsync({
        name: '测试俱乐部',
        isPublic: true,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(clubId).toBe('new-club-id');
    expect(insertCallCount).toBe(1);
  });

  it('未登录时抛出错误', async () => {
    useAuthMock.mockReturnValue({ user: null });

    const { result } = renderHook(() => useCreateClub(), { wrapper });

    await expect(
      result.current.mutateAsync({ name: '测试', isPublic: true })
    ).rejects.toThrow('请先登录');
  });
});

// ─── useJoinClub hook 测试 ────────────────────────────────────

describe('useJoinClub', () => {
  it('加入公开俱乐部时 status 为 active', async () => {
    let insertedData: any = null;
    fromMock.mockImplementation((table: string) => {
      if (table === 'club_members') {
        return {
          insert: vi.fn().mockImplementation((data) => {
            insertedData = data;
            return Promise.resolve({ error: null });
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useJoinClub(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ clubId: 'club-1', isPublic: true });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertedData.status).toBe('active');
  });

  it('申请私密俱乐部时 status 为 pending', async () => {
    let insertedData: any = null;
    fromMock.mockImplementation((table: string) => {
      if (table === 'club_members') {
        return {
          insert: vi.fn().mockImplementation((data) => {
            insertedData = data;
            return Promise.resolve({ error: null });
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useJoinClub(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ clubId: 'club-2', isPublic: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertedData.status).toBe('pending');
  });

  it('未登录时抛出错误', async () => {
    useAuthMock.mockReturnValue({ user: null });

    const { result } = renderHook(() => useJoinClub(), { wrapper });

    await expect(
      result.current.mutateAsync({ clubId: 'club-1', isPublic: true })
    ).rejects.toThrow('请先登录');
  });
});

// ─── useLeaveClub hook 测试 ───────────────────────────────────

describe('useLeaveClub', () => {
  it('成功退出俱乐部', async () => {
    const eqMock = vi.fn().mockReturnThis();
    eqMock
      .mockReturnValueOnce({ eq: eqMock })
      .mockResolvedValueOnce({ error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === 'club_members') {
        return {
          delete: vi.fn(() => ({ eq: eqMock })),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useLeaveClub(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('club-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fromMock).toHaveBeenCalledWith('club_members');
  });

  it('未登录时抛出错误', async () => {
    useAuthMock.mockReturnValue({ user: null });

    const { result } = renderHook(() => useLeaveClub(), { wrapper });

    await expect(result.current.mutateAsync('club-1')).rejects.toThrow('请先登录');
  });
});
