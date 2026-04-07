import { render, screen, waitFor } from '@testing-library/react'
import { within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminPage from '@/pages/Admin'

const toastMock = vi.fn()
const navigateMock = vi.fn()
const invalidateQueriesMock = vi.fn()
const supabaseCalls: Array<{ table: string; action: string; payload?: any }> = []
const supabaseFailures = vi.hoisted(() => ({ byTableAction: {} as Record<string, string> }))

const authState = vi.hoisted(() => ({ user: { id: 'admin-1' }, isSuperAdmin: true }))
const bannedWordsState = vi.hoisted(() => ({
  invalidateBannedWordsCache: vi.fn(),
}))
const cityState = vi.hoisted(() => ({
  allCities: [
    { id: 'chengdu', name: '成都' },
    { id: 'hangzhou', name: '杭州' },
  ],
}))
const queryState = vi.hoisted(() => ({
  profiles: [
    { id: 'u1', nickname: '牌友A', phone: '13800138000', city_id: 'hangzhou', created_at: '2026-03-25T00:00:00Z' },
    { id: 'u2', nickname: '牌友B', phone: '13800138001', city_id: 'hangzhou', created_at: '2026-03-30T00:00:00Z' },
    { id: 'u3', nickname: '牌友C', phone: '13800138002', city_id: 'chengdu', created_at: '2026-02-18T00:00:00Z' },
  ],
  userRoles: [{ user_id: 'u1', role: 'user' }],
  groupsFull: [
    {
      id: 'g1',
      address: '西湖店',
      city_id: 'hangzhou',
      created_at: '2026-03-20T00:00:00Z',
      start_time: '2026-03-24T19:00:00Z',
      end_time: '2026-03-24T23:00:00Z',
      total_slots: 4,
      status: 'COMPLETED',
      host: { id: 'u1', nickname: '牌友A' },
      members: [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u4' }],
    },
    {
      id: 'g2',
      address: '春熙路店',
      city_id: 'chengdu',
      created_at: '2026-02-20T00:00:00Z',
      start_time: '2026-02-22T19:00:00Z',
      end_time: '2026-02-22T23:00:00Z',
      total_slots: 4,
      status: 'COMPLETED',
      host: { id: 'u3', nickname: '牌友C' },
      members: [{ user_id: 'u3' }, { user_id: 'u5' }],
    },
    {
      id: 'g3',
      address: '待开局',
      city_id: 'hangzhou',
      created_at: '2026-03-28T00:00:00Z',
      start_time: '2026-04-10T19:00:00Z',
      end_time: '2026-04-10T23:00:00Z',
      total_slots: 4,
      status: 'OPEN',
      host: { id: 'u2', nickname: '牌友B' },
      members: [{ user_id: 'u2' }],
    },
  ],
  playStyles: [{ id: 'ps1', name: '血战到底' }],
  reports: [
    {
      id: 'r1',
      reporter: { id: 'u9', nickname: '举报人' },
      reported: { id: 'u8', nickname: '被举报人' },
      group: { id: 'g1', city_id: 'hangzhou' },
      reason: '辱骂',
      status: 'pending',
      created_at: '2026-03-25T00:00:00Z',
    },
    {
      id: 'r2',
      reporter: { id: 'u1', nickname: '牌友A' },
      reported: { id: 'u3', nickname: '牌友C' },
      group: { id: 'g2', city_id: 'chengdu' },
      reason: '作弊',
      status: 'pending',
      created_at: '2026-03-20T00:00:00Z',
    },
    {
      id: 'r3',
      reporter: { id: 'u2', nickname: '牌友B' },
      reported: { id: 'u5', nickname: '未知用户' },
      group: { id: 'unknown_group' },
      reason: '骚扰',
      status: 'pending',
      created_at: '2026-03-15T00:00:00Z',
    },
  ],
  reviews: [
    {
      id: 'rv1',
      reviewer: { nickname: '评价人' },
      target: { nickname: '被评价人' },
      skill: 5,
      attitude: 4,
      punctuality: 5,
      comment: '不错',
      created_at: '2026-03-25T00:00:00Z',
    },
  ],
  appeals: [
    {
      id: 'ap1',
      user: { id: 'u2', nickname: '申诉人' },
      reason: '误扣分',
      created_at: '2026-03-25T00:00:00Z',
      change: -3,
    },
  ],
  exits: [
    {
      id: 'ex1',
      user: { id: 'u3', nickname: '退出人' },
      group: { id: 'g1', address: '天府广场店' },
      exit_type: 'left',
      reason: '有事',
      credit_change: -3,
      created_at: '2026-03-25T00:00:00Z',
    },
  ],
  chatGroups: [{ id: 'g1', address: '天府广场店', status: 'OPEN', host: { nickname: '牌友A' } }],
  joinRequests: [
    {
      id: 'jr1',
      user_id: 'u1',
      created_at: '2026-03-24T08:00:00Z',
      status: 'PENDING',
      group: { id: 'g1', city_id: 'hangzhou' },
    },
    {
      id: 'jr2',
      user_id: 'u2',
      created_at: '2026-03-26T08:00:00Z',
      status: 'APPROVED',
      group: { id: 'g1', city_id: 'hangzhou' },
    },
    {
      id: 'jr3',
      user_id: 'u3',
      created_at: '2026-02-21T08:00:00Z',
      status: 'PENDING',
      group: { id: 'g2', city_id: 'chengdu' },
    },
  ],
  shareMessages: [
    {
      id: 'dm1',
      sender_id: 'u1',
      created_at: '2026-03-27T10:00:00Z',
      type: 'group_invite',
      metadata: { group_id: 'g1', is_host_invite: true },
    },
    {
      id: 'dm2',
      sender_id: 'u3',
      created_at: '2026-02-21T10:00:00Z',
      type: 'group_invite',
      metadata: { group_id: 'g2', is_host_invite: false },
    },
  ],
  inviteBindings: [
    {
      id: 'ib1',
      invite_code: 'HOST001',
      bound_at: '2026-03-31T09:30:00.000Z',
      bind_source: 'register',
      inviter: { id: 'u1', nickname: '牌友A' },
      invitee: { id: 'u2', nickname: '新牌友', city_id: 'hangzhou' },
    },
    {
      id: 'ib2',
      invite_code: 'CD001',
      bound_at: '2026-02-20T09:30:00.000Z',
      bind_source: 'settings',
      inviter: { id: 'u3', nickname: '牌友C' },
      invitee: { id: 'u6', nickname: '成都新牌友', city_id: 'chengdu' },
    },
  ],
  systemSettings: [
    { key: 'leave_credit_deduction', value: '3' },
    { key: 'kick_credit_deduction', value: '5' },
  ],
  bannedWords: [{ id: 'bw1', word: '旧词' }],
}))

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn((table: string) => ({
    upsert: vi.fn(async (payload: any) => {
      supabaseCalls.push({ table, action: 'upsert', payload })
      const failure = supabaseFailures.byTableAction[`${table}:upsert`]
      if (failure) return { error: { message: failure } }
      return { error: null }
    }),
    insert: vi.fn(async (payload: any) => {
      supabaseCalls.push({ table, action: 'insert', payload })
      const failure = supabaseFailures.byTableAction[`${table}:insert`]
      if (failure) return { error: { message: failure } }
      return { error: null }
    }),
    delete: vi.fn(() => ({
      eq: vi.fn(async (field: string, value: any) => {
        supabaseCalls.push({ table, action: 'delete', payload: { [field]: value } })
        return { error: null }
      }),
    })),
    update: vi.fn((payload: any) => ({
      eq: vi.fn(async (field: string, value: any) => {
        supabaseCalls.push({ table, action: 'update', payload: { ...payload, [field]: value } })
        return { error: null }
      }),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: { credit_score: 90 }, error: null })) })),
    })),
  })),
  rpc: vi.fn(async (_fn: string, payload: any) => {
    supabaseCalls.push({ table: 'rpc', action: 'call', payload })
    return { error: null }
  }),
  functions: { invoke: vi.fn(async () => ({ data: { ok: true }, error: null })) },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }))
vi.mock('@/contexts/CityContext', () => ({ useCity: () => cityState }))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))
vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }))
vi.mock('@/components/layout/AppLayout', () => ({ default: ({ children }: any) => <div>{children}</div> }))
vi.mock('@/components/shared/UserAvatar', () => ({ default: ({ nickname }: any) => <span>{nickname}</span> }))
vi.mock('@/components/shared/CreditBadge', () => ({ default: ({ score }: any) => <span>信用{score}</span> }))
vi.mock('@/components/shared/LoadingState', () => ({ default: () => <div>加载中...</div> }))
vi.mock('@/lib/banned-words', () => ({ invalidateBannedWordsCache: bannedWordsState.invalidateBannedWordsCache }))
vi.mock('@/components/ui/tabs', () => {
  const React = require('react')
  const Ctx = React.createContext({ value: 'users', setValue: (_v: string) => {} })
  return {
    Tabs: ({ value, onValueChange, children }: any) => (
      <Ctx.Provider value={{ value, setValue: onValueChange }}>{children}</Ctx.Provider>
    ),
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ value, children }: any) => {
      const ctx = React.useContext(Ctx)
      return (
        <button role="tab" onClick={() => ctx.setValue(value)}>
          {children}
        </button>
      )
    },
    TabsContent: ({ value, children }: any) => {
      const ctx = React.useContext(Ctx)
      return ctx.value === value ? <div>{children}</div> : null
    },
  }
})
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
    useQuery: ({ queryKey }: any) => {
      const map: Record<string, any> = {
        'admin-profiles': queryState.profiles,
        'admin-user-roles': queryState.userRoles,
        'admin-groups-full': queryState.groupsFull,
        'admin-play-styles': queryState.playStyles,
        'admin-reports': queryState.reports,
        'admin-reviews': queryState.reviews,
        'admin-appeals': queryState.appeals,
        'admin-exits': queryState.exits,
        'admin-chat-groups': queryState.chatGroups,
        'admin-join-requests': queryState.joinRequests,
        'admin-share-messages': queryState.shareMessages,
        'admin-invite-bindings': queryState.inviteBindings,
        'admin-system-settings': queryState.systemSettings,
        'admin-banned-words': queryState.bannedWords,
        'admin-activity-slot-events': [],
      }
      return { data: map[queryKey[0]] ?? [], isLoading: false }
    },
  }
})

globalThis.confirm = vi.fn(() => true) as any

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  )
}

describe('AdminPage', () => {
  beforeEach(() => {
    toastMock.mockReset()
    navigateMock.mockReset()
    invalidateQueriesMock.mockReset()
    bannedWordsState.invalidateBannedWordsCache.mockReset()
    supabaseCalls.length = 0
    supabaseFailures.byTableAction = {}
  })

  it('adds and deletes cities from admin tab', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: '城市' }))
    const cityInput = screen.getByPlaceholderText('新增城市名称')
    await user.type(cityInput, '绵阳')
    await user.click(cityInput.parentElement!.querySelector('button') as HTMLButtonElement)

    await waitFor(() =>
      expect(supabaseCalls.some(c => c.table === 'cities' && c.action === 'insert' && c.payload.name === '绵阳')).toBe(
        true,
      ),
    )
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已添加城市: 绵阳' }))

    await user.click(
      screen.getByText('杭州').closest('div')!.parentElement!.querySelector('button') as HTMLButtonElement,
    )
    await waitFor(() =>
      expect(
        supabaseCalls.some(c => c.table === 'cities' && c.action === 'delete' && c.payload.id === 'hangzhou'),
      ).toBe(true),
    )
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已删除: 杭州' }))
  })

  it('renders governance data across reports reviews appeals and exits tabs', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: '举报' }))
    expect(screen.getByText('举报人')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '评价' }))
    expect(screen.getByText('被评价人')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /申诉/ }))
    expect(screen.getByText('申诉人')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '退出记录' }))
    expect(screen.getByText('退出人')).toBeInTheDocument()
  })

  it('notifies reported user after resolving a report', async () => {
    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('tab', { name: '举报' }))
    const buttons = screen.getAllByRole('button', { name: '处理' })
    await user.click(buttons[0])

    await waitFor(() => {
      expect(
        supabaseCalls.some(
          c =>
            c.table === 'notifications' &&
            c.action === 'insert' &&
            c.payload.user_id === 'u8' &&
            c.payload.metadata?.event_key === 'report_result' &&
            c.payload.metadata?.audience_role === 'reported_user',
        ),
      ).toBe(true)
    })
    expect(
      supabaseCalls.some(
        c =>
          c.table === 'notification_delivery_logs' &&
          c.action === 'insert' &&
          c.payload.status === 'sent' &&
          c.payload.event_key === 'report_result' &&
          c.payload.audience_role === 'reported_user',
      ),
    ).toBe(true)
  })

  it('shows warning when report result notification fails after resolve succeeds', async () => {
    supabaseFailures.byTableAction['notifications:insert'] = 'notify failed'
    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('tab', { name: '举报' }))
    const buttons = screen.getAllByRole('button', { name: '处理' })
    await user.click(buttons[0])

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '举报结果通知发送失败',
          variant: 'destructive',
        }),
      )
    })
    expect(
      supabaseCalls.some(
        c =>
          c.table === 'notification_delivery_logs' &&
          c.action === 'insert' &&
          c.payload.status === 'failed' &&
          c.payload.event_key === 'report_result',
      ),
    ).toBe(true)
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '举报已处理' }))
  })

  it('renders invite attribution data in admin tab', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: '邀请归因' }))

    expect(screen.getByText('HOST001')).toBeInTheDocument()
    expect(screen.getByText('邀请人：牌友A → 被邀请人：新牌友')).toBeInTheDocument()
    expect(screen.getByText('03-31 17:30')).toBeInTheDocument()
  })

  it('renders dashboard metrics and applies city filter', async () => {
    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('tab', { name: '数据看板' }))
    await user.clear(screen.getByLabelText('开始日期'))
    await user.type(screen.getByLabelText('开始日期'), '2026-03-01')
    await user.clear(screen.getByLabelText('结束日期'))
    await user.type(screen.getByLabelText('结束日期'), '2026-03-31')

    expect(within(screen.getByTestId('dashboard-metric-registrations')).getByText('2')).toBeInTheDocument()
    expect(within(screen.getByTestId('dashboard-metric-applications')).getByText('2')).toBeInTheDocument()
    expect(within(screen.getByTestId('dashboard-metric-completedGroups')).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByTestId('dashboard-metric-attendance')).getByText('3')).toBeInTheDocument()
    expect(within(screen.getByTestId('dashboard-metric-reports')).getByText('3')).toBeInTheDocument()
    expect(within(screen.getByTestId('dashboard-metric-shares')).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByTestId('dashboard-metric-inviteBindings')).getByText('1')).toBeInTheDocument()
    expect(screen.getByText('渠道分布')).toBeInTheDocument()
    expect(screen.getByText('邀请码注册')).toBeInTheDocument()
    expect(screen.getByText('未知城市')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('城市'), 'hangzhou')

    expect(screen.getByText('口径说明')).toBeInTheDocument()
    expect(screen.getByLabelText('城市')).toHaveValue('hangzhou')
    expect(within(screen.getByTestId('dashboard-metric-registrations')).getByText('2')).toBeInTheDocument()
    expect(within(screen.getByTestId('dashboard-metric-shares')).getByText('1')).toBeInTheDocument()
  })

  it('adds banned word and invalidates client cache', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: '设置' }))
    const bannedInput = screen.getByPlaceholderText('输入违禁词...')
    await user.type(bannedInput, '新词')
    await user.click(bannedInput.parentElement!.querySelector('button') as HTMLButtonElement)

    await waitFor(() =>
      expect(
        supabaseCalls.some(c => c.table === 'banned_words' && c.action === 'insert' && c.payload.word === '新词'),
      ).toBe(true),
    )
    await waitFor(() => expect(bannedWordsState.invalidateBannedWordsCache).toHaveBeenCalled())
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已添加：新词' }))
  })

  it('saves homepage activity slot configuration from settings tab', async () => {
    queryState.systemSettings = [
      { key: 'leave_credit_deduction', value: '3' },
      { key: 'kick_credit_deduction', value: '5' },
      { key: 'homepage_activity_slots', value: [] },
      { key: 'activity_slot_stats', value: { existing: { impressions: 12, clicks: 4, conversions: 1 } } },
    ]

    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('tab', { name: '设置' }))
    await user.click(screen.getByRole('button', { name: '新增活动位' }))
    await user.type(screen.getByLabelText('活动标题'), '春季冲榜赛')
    await user.type(screen.getByLabelText('图片地址'), 'https://example.com/spring.png')
    await user.type(screen.getByLabelText('跳转链接'), '/community')
    await user.type(screen.getByLabelText('展示城市'), '杭州,成都')
    await user.type(screen.getByLabelText('排序值'), '8')
    await user.click(screen.getByRole('button', { name: '保存活动位配置' }))

    await waitFor(() => {
      expect(
        supabaseCalls.some(
          c =>
            c.table === 'system_settings' &&
            c.action === 'upsert' &&
            c.payload.key === 'homepage_activity_slots' &&
            Array.isArray(c.payload.value) &&
            c.payload.value.some((item: any) => item.title === '春季冲榜赛' && item.link_url === '/community'),
        ),
      ).toBe(true)
    })

    expect(screen.getByText('曝光 12 / 点击 4 / 转化 1')).toBeInTheDocument()
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '已保存活动位配置' }))
  })

  it('replays existing activity slot config into editable form fields', async () => {
    queryState.systemSettings = [
      { key: 'leave_credit_deduction', value: '3' },
      { key: 'kick_credit_deduction', value: '5' },
      {
        key: 'homepage_activity_slots',
        value: [
          {
            id: 'existing-slot',
            title: '已上线活动',
            image_url: 'https://example.com/existing.png',
            link_url: '/group/create',
            city_ids: ['hangzhou'],
            cta_text: '马上参加',
            start_at: '2026-04-01T10:00:00.000Z',
            end_at: '2026-04-09T10:00:00.000Z',
            sort_order: 3,
            enabled: true,
            max_impressions_per_session: 2,
            created_at: '2026-04-01T10:00:00.000Z',
            updated_at: '2026-04-01T10:00:00.000Z',
          },
        ],
      },
      { key: 'activity_slot_stats', value: {} },
    ]

    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: '设置' }))

    expect(await screen.findByDisplayValue('已上线活动')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com/existing.png')).toBeInTheDocument()
    expect(screen.getByDisplayValue('/group/create')).toBeInTheDocument()
    expect(screen.getByDisplayValue('杭州')).toBeInTheDocument()
  })
})
