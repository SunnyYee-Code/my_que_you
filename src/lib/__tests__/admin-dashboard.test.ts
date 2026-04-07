import { describe, expect, it } from 'vitest';
import { buildAdminDashboard } from '@/lib/admin-dashboard';

describe('admin dashboard helpers', () => {
  it('aggregates metrics, period comparison and city distribution', () => {
    const result = buildAdminDashboard({
      rangeStart: '2026-03-01',
      rangeEnd: '2026-03-31',
      cityId: 'all',
      cities: [
        { id: 'hangzhou', name: '杭州' },
        { id: 'chengdu', name: '成都' },
      ],
      profiles: [
        { id: 'u1', created_at: '2026-03-25T00:00:00Z', city_id: 'hangzhou' },
        { id: 'u2', created_at: '2026-03-31T16:30:00Z', city_id: 'hangzhou' },
        { id: 'u3', created_at: '2026-02-18T00:00:00Z', city_id: 'chengdu' },
      ],
      joinRequests: [
        { id: 'jr1', user_id: 'u1', created_at: '2026-03-24T08:00:00Z', group: { city_id: 'hangzhou' } },
        { id: 'jr2', user_id: 'u2', created_at: '2026-03-26T08:00:00Z', group: { city_id: 'hangzhou' } },
        { id: 'jr3', user_id: 'u3', created_at: '2026-02-21T08:00:00Z', group: { city_id: 'chengdu' } },
      ],
      groups: [
        {
          id: 'g1',
          status: 'COMPLETED',
          city_id: 'hangzhou',
          host_id: 'u1',
          start_time: '2026-03-24T19:00:00Z',
          members: [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u4' }],
        },
        {
          id: 'g2',
          status: 'COMPLETED',
          city_id: 'chengdu',
          host_id: 'u3',
          start_time: '2026-02-22T19:00:00Z',
          members: [{ user_id: 'u3' }, { user_id: 'u5' }],
        },
      ],
      reports: [
        { id: 'r1', reporter_id: 'u1', created_at: '2026-03-25T00:00:00Z', group: { city_id: 'hangzhou' } },
        { id: 'r2', reporter_id: 'u2', created_at: '2026-03-26T00:00:00Z', group: null },
      ],
      shareMessages: [
        { id: 'dm1', sender_id: 'u1', created_at: '2026-03-27T10:00:00Z', metadata: { group_id: 'g1', is_host_invite: true } },
        { id: 'dm2', sender_id: 'u3', created_at: '2026-02-21T10:00:00Z', metadata: { group_id: 'g2', is_host_invite: false } },
      ],
      inviteBindings: [
        { id: 'ib1', bound_at: '2026-03-31T09:30:00Z', bind_source: 'register', invitee: { id: 'u2', city_id: 'hangzhou' } },
        { id: 'ib2', bound_at: '2026-02-20T09:30:00Z', bind_source: 'settings', invitee: { id: 'u3', city_id: 'chengdu' } },
      ],
    });

    expect(result.summary.registrations.total).toBe(2);
    expect(result.summary.applications.total).toBe(2);
    expect(result.summary.completedGroups.total).toBe(1);
    expect(result.summary.attendance.total).toBe(3);
    expect(result.summary.reports.total).toBe(2);
    expect(result.summary.shares.total).toBe(1);
    expect(result.summary.inviteBindings.total).toBe(1);

    expect(result.summary.registrations.previousTotal).toBe(1);
    expect(result.summary.registrations.changeRatio).toBe(100);

    expect(result.trend.find((item) => item.date === '2026-04-01')).toMatchObject({
      registrations: 1,
    });
    expect(result.trend.find((item) => item.date === '2026-03-24')).toMatchObject({
      completedGroups: 1,
      attendance: 3,
      applications: 1,
    });

    expect(result.cityBreakdown).toEqual([
      expect.objectContaining({
        cityId: 'hangzhou',
        cityName: '杭州',
        registrations: 2,
        applications: 2,
        completedGroups: 1,
        attendance: 3,
        reports: 1,
        shares: 1,
        inviteBindings: 1,
      }),
      expect.objectContaining({
        cityId: 'unknown',
        cityName: '未知城市',
        reports: 1,
      }),
    ]);

    expect(result.channelBreakdown).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channelKey: 'organic',
        channelLabel: '自然流量',
        registrations: 1,
      }),
      expect.objectContaining({
        channelKey: 'invite_register',
        channelLabel: '邀请码注册',
        registrations: 1,
        applications: 1,
        reports: 1,
        shares: 1,
        inviteBindings: 1,
      }),
    ]));
  });
});
