import { parseISO, addDays, differenceInCalendarDays } from 'date-fns'

type City = { id: string; name: string }

function toLocalDateStr(dateStr: string) {
  // Asia/Shanghai is UTC+8 — approximate by adding 8 hours to UTC timestamps
  const d = new Date(dateStr)
  const shifted = new Date(d.getTime() + 8 * 3600 * 1000)
  return shifted.toISOString().slice(0, 10)
}

function utcDateStr(dateStr: string) {
  return new Date(dateStr).toISOString().slice(0, 10)
}

export function buildAdminDashboard(opts: any) {
  const {
    rangeStart,
    rangeEnd,
    cityId,
    cities = [],
    profiles = [],
    joinRequests = [],
    groups = [],
    reports = [],
    shareMessages = [],
    inviteBindings = [],
  } = opts || {}

  const cityMap = new Map<string, string>()
  cities.forEach((c: City) => cityMap.set(c.id, c.name))

  const unknownCityId = 'unknown'

  // build date buckets: include an extra day to accommodate local timezone overflow
  const start = parseISO(rangeStart + 'T00:00:00.000Z')
  const end = parseISO(rangeEnd + 'T00:00:00.000Z')
  const days = differenceInCalendarDays(end, start) + 1
  const trendDates: string[] = []
  for (let i = 0; i < days + 1; i++) {
    const d = addDays(start, i)
    trendDates.push(d.toISOString().slice(0, 10))
  }

  function makeSummarySlot(label: string, note: string) {
    return { label, note, total: 0, previousTotal: 0, changeRatio: null }
  }

  const summary = {
    registrations: makeSummarySlot('注册用户', '按用户 `created_at` 统计，按本地时区分日'),
    applications: makeSummarySlot('申请数', '按 `join_requests.created_at` 统计，按本地时区分日'),
    completedGroups: makeSummarySlot('完成拼团', '按拼团 `start_time` 统计（UTC）'),
    attendance: makeSummarySlot('到场', '按已完成拼团成员数统计'),
    reports: makeSummarySlot('举报', '按 `reports.created_at` 统计，优先以拼团城市为准'),
    shares: makeSummarySlot('分享/邀请', '站内分享消息触达统计'),
    inviteBindings: makeSummarySlot('邀请绑定', '按 `user_invite_bindings.bound_at` 统计'),
  }

  const trend = trendDates.map(d => ({
    date: d,
    registrations: 0,
    applications: 0,
    completedGroups: 0,
    attendance: 0,
    reports: 0,
    shares: 0,
    inviteBindings: 0,
  }))

  // helpers
  function inRangeLocal(dateStr: string) {
    const local = toLocalDateStr(dateStr)
    return local >= rangeStart && local <= rangeEnd
  }

  function inRangeUTC(dateStr: string) {
    const utc = utcDateStr(dateStr)
    return utc >= rangeStart && utc <= rangeEnd
  }

  // build invitee set for attribution
  const inviteeIds = new Set<string>()
  const inviteBindingsInRange = inviteBindings.filter((b: any) => b.bound_at && inRangeUTC(b.bound_at))
  inviteBindingsInRange.forEach((b: any) => {
    if (b.invitee?.id) inviteeIds.add(b.invitee.id)
  })

  // registrations
  profiles.forEach((p: any) => {
    if (!p.created_at) return
    const localDate = toLocalDateStr(p.created_at)
    // include if local date in range (note: trend includes extra day already)
    if (localDate >= trend[0].date && localDate <= trend[trend.length - 1].date) {
      const slot = trend.find(t => t.date === localDate)
      if (slot) slot.registrations += 1
    }

    if (inRangeUTC(p.created_at)) {
      summary.registrations.total += 1
    }
  })

  // applications (join requests)
  joinRequests.forEach((jr: any) => {
    if (!jr.created_at) return
    const localDate = toLocalDateStr(jr.created_at)
    if (localDate >= trend[0].date && localDate <= trend[trend.length - 1].date) {
      const slot = trend.find(t => t.date === localDate)
      if (slot) slot.applications += 1
    }
    if (inRangeUTC(jr.created_at)) summary.applications.total += 1
  })

  // completed groups & attendance: use group's start_time UTC date for bucketing (keeps legacy behavior)
  groups.forEach((g: any) => {
    if (!g.start_time) return
    const utcDate = utcDateStr(g.start_time)
    if (utcDate >= trend[0].date && utcDate <= trend[trend.length - 1].date) {
      const slot = trend.find(t => t.date === utcDate)
      if (slot) {
        if (g.status === 'COMPLETED') {
          slot.completedGroups += 1
          slot.attendance += (g.members || []).length || 0
        }
      }
    }
    if (utcDate >= rangeStart && utcDate <= rangeEnd) {
      if (g.status === 'COMPLETED') {
        summary.completedGroups.total += 1
        summary.attendance.total += (g.members || []).length || 0
      }
    }
  })

  // reports: use report.group.city_id when present, else unknown
  const cityStats = new Map<string, any>()
  function ensureCityRow(cityIdKey: string) {
    if (!cityStats.has(cityIdKey)) {
      cityStats.set(cityIdKey, {
        cityId: cityIdKey,
        cityName: cityMap.get(cityIdKey) || (cityIdKey === unknownCityId ? '未知城市' : cityIdKey),
        registrations: 0,
        applications: 0,
        completedGroups: 0,
        attendance: 0,
        reports: 0,
        shares: 0,
        inviteBindings: 0,
      })
    }
    return cityStats.get(cityIdKey)
  }

  // add registrations/applications/completedGroups to city buckets
  profiles.forEach((p: any) => {
    if (!p.created_at) return
    if (!inRangeUTC(p.created_at)) return
    const cid = p.city_id || unknownCityId
    const row = ensureCityRow(cid)
    row.registrations += 1
  })
  joinRequests.forEach((jr: any) => {
    if (!jr.created_at) return
    if (!inRangeUTC(jr.created_at)) return
    const cid = jr.group?.city_id || unknownCityId
    const row = ensureCityRow(cid)
    row.applications += 1
  })
  groups.forEach((g: any) => {
    const utcDate = utcDateStr(g.start_time || '')
    if (!(utcDate >= rangeStart && utcDate <= rangeEnd)) return
    const cid = g.city_id || unknownCityId
    const row = ensureCityRow(cid)
    if (g.status === 'COMPLETED') {
      row.completedGroups += 1
      row.attendance += (g.members || []).length || 0
    }
  })

  // reports
  reports.forEach((r: any) => {
    if (!r.created_at) return
    const localDate = toLocalDateStr(r.created_at)
    if (localDate >= trend[0].date && localDate <= trend[trend.length - 1].date) {
      const slot = trend.find(t => t.date === localDate)
      if (slot) slot.reports += 1
    }
    if (inRangeUTC(r.created_at)) {
      const cid = r.group?.city_id || unknownCityId
      const row = ensureCityRow(cid)
      row.reports += 1
      summary.reports.total += 1
    }
  })

  // shareMessages: attribute to invite_register if related inviteBindings exist in same city and period
  shareMessages.forEach((s: any) => {
    if (!s.created_at) return
    const localDate = toLocalDateStr(s.created_at)
    if (localDate >= trend[0].date && localDate <= trend[trend.length - 1].date) {
      const slot = trend.find(t => t.date === localDate)
      if (slot) slot.shares += 1
    }
    if (inRangeUTC(s.created_at)) {
      // find related group city if provided
      const groupId = s.metadata?.group_id
      let cid = unknownCityId
      if (groupId) {
        const g = groups.find((gg: any) => gg.id === groupId)
        if (g) cid = g.city_id || unknownCityId
      }
      const row = ensureCityRow(cid)
      row.shares += 1
      summary.shares.total += 1
    }
  })

  // inviteBindings
  inviteBindings.forEach((b: any) => {
    if (!b.bound_at) return
    const localDate = toLocalDateStr(b.bound_at)
    if (localDate >= trend[0].date && localDate <= trend[trend.length - 1].date) {
      const slot = trend.find(t => t.date === localDate)
      if (slot) slot.inviteBindings += 1
    }
    if (inRangeUTC(b.bound_at)) {
      const cid = b.invitee?.city_id || unknownCityId
      const row = ensureCityRow(cid)
      row.inviteBindings += 1
      summary.inviteBindings.total += 1
    }
  })

  // Channel breakdown
  const channels: any = new Map()
  function ensureChannel(key: string, label: string) {
    if (!channels.has(key))
      channels.set(key, {
        channelKey: key,
        channelLabel: label,
        registrations: 0,
        applications: 0,
        completedGroups: 0,
        attendance: 0,
        reports: 0,
        shares: 0,
        inviteBindings: 0,
      })
    return channels.get(key)
  }
  ensureChannel('organic', '自然流量')
  ensureChannel('invite_register', '邀请码注册')

  // registrations by channel (inviteeIds captured earlier)
  profiles.forEach((p: any) => {
    if (!p.created_at) return
    if (!inRangeUTC(p.created_at)) return
    const ch = inviteeIds.has(p.id)
      ? ensureChannel('invite_register', '邀请码注册')
      : ensureChannel('organic', '自然流量')
    ch.registrations += 1
  })
  // applications
  joinRequests.forEach((jr: any) => {
    if (!jr.created_at) return
    if (!inRangeUTC(jr.created_at)) return
    const ch = inviteeIds.has(jr.user_id)
      ? ensureChannel('invite_register', '邀请码注册')
      : ensureChannel('organic', '自然流量')
    ch.applications += 1
  })
  // reports
  reports.forEach((r: any) => {
    if (!r.created_at) return
    if (!inRangeUTC(r.created_at)) return
    const ch = inviteeIds.has(r.reporter_id)
      ? ensureChannel('invite_register', '邀请码注册')
      : ensureChannel('organic', '自然流量')
    ch.reports += 1
  })
  // shares: special attribution — if share is host_invite and there exists inviteBindings in same city, attribute to invite_register
  shareMessages.forEach((s: any) => {
    if (!s.created_at) return
    if (!inRangeUTC(s.created_at)) return
    const isHostInvite = !!s.metadata?.is_host_invite
    let attributedToInvite = false
    if (isHostInvite && s.metadata?.group_id) {
      const g = groups.find((gg: any) => gg.id === s.metadata.group_id)
      if (g) {
        const anyBinding = inviteBindingsInRange.find(
          (b: any) => (b.invitee?.city_id || unknownCityId) === (g.city_id || unknownCityId),
        )
        if (anyBinding) attributedToInvite = true
      }
    }
    const ch = attributedToInvite
      ? ensureChannel('invite_register', '邀请码注册')
      : ensureChannel('organic', '自然流量')
    ch.shares += 1
  })
  // inviteBindings channel mapping
  inviteBindings.forEach((b: any) => {
    if (!b.bound_at) return
    if (!inRangeUTC(b.bound_at)) return
    const key = b.bind_source === 'register' ? 'invite_register' : 'organic'
    const ch = ensureChannel(key, key === 'invite_register' ? '邀请码注册' : '自然流量')
    ch.inviteBindings += 1
  })

  // previous period calc for registrations
  const periodDays = differenceInCalendarDays(end, start) + 1
  const prevEndDate = addDays(start, -1)
  const prevStartDate = addDays(start, -periodDays)
  const prevStartStr = prevStartDate.toISOString().slice(0, 10)
  const prevEndStr = prevEndDate.toISOString().slice(0, 10)
  let prevRegistrations = 0
  profiles.forEach((p: any) => {
    const local = toLocalDateStr(p.created_at || '')
    if (local >= prevStartStr && local <= prevEndStr) prevRegistrations += 1
  })
  summary.registrations.previousTotal = prevRegistrations
  summary.registrations.changeRatio =
    prevRegistrations === 0
      ? summary.registrations.total === 0
        ? 0
        : 100
      : Math.round(((summary.registrations.total - prevRegistrations) / prevRegistrations) * 100)

  // wire up summary totals from computed counters already accumulated above
  // (completedGroups, attendance, reports, shares, inviteBindings already populated)

  // assemble city breakdown array
  const cityBreakdown = Array.from(cityStats.values()).sort(
    (a: any, b: any) => (b.registrations || 0) - (a.registrations || 0),
  )

  const channelBreakdown = Array.from(channels.values())

  return {
    summary,
    trend,
    cityBreakdown,
    channelBreakdown,
  }
}

export type { City }
