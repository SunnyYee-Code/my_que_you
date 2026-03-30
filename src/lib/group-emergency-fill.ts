export const EMERGENCY_FILL_MAX_MINUTES = 120;
export const EMERGENCY_FILL_MAX_NEEDED_SLOTS = 2;

type GroupEmergencyFillInput = {
  status?: string | null;
  needed_slots?: number | null;
  start_time?: string | null;
};

type GroupEmergencyFillMeta = {
  isEmergencyFill: boolean;
  minutesUntilStart: number | null;
  badgeText: string | null;
  actionText: string;
  countdownText: string | null;
  description: string | null;
};

function normalizeMinutesUntilStart(startTime: string | null | undefined, now: Date) {
  if (!startTime) return null;

  const targetTime = new Date(startTime).getTime();
  const currentTime = now.getTime();
  if (!Number.isFinite(targetTime) || !Number.isFinite(currentTime)) return null;

  const diffMs = targetTime - currentTime;
  if (diffMs <= 0) {
    return Math.ceil(diffMs / 60_000);
  }

  return Math.ceil(diffMs / 60_000);
}

export function getGroupEmergencyFillMeta(
  group: GroupEmergencyFillInput,
  now: Date = new Date(),
): GroupEmergencyFillMeta {
  const neededSlots = Math.max(0, Number(group.needed_slots ?? 0));
  const minutesUntilStart = normalizeMinutesUntilStart(group.start_time, now);
  const safeMinutesUntilStart = minutesUntilStart;
  const isEmergencyFill = group.status === 'OPEN'
    && neededSlots > 0
    && neededSlots <= EMERGENCY_FILL_MAX_NEEDED_SLOTS
    && safeMinutesUntilStart !== null
    && safeMinutesUntilStart > 0
    && safeMinutesUntilStart <= EMERGENCY_FILL_MAX_MINUTES;

  if (!isEmergencyFill) {
    return {
      isEmergencyFill: false,
      minutesUntilStart: safeMinutesUntilStart,
      badgeText: null,
      actionText: '加入',
      countdownText: null,
      description: null,
    };
  }

  return {
    isEmergencyFill: true,
    minutesUntilStart: safeMinutesUntilStart,
    badgeText: '紧急补位',
    actionText: '立即补位',
    countdownText: `${safeMinutesUntilStart}分钟内开局`,
    description: `距开局约 ${safeMinutesUntilStart} 分钟，还缺 ${neededSlots} 人`,
  };
}

export function compareGroupsByEmergencyFill(
  left: GroupEmergencyFillInput,
  right: GroupEmergencyFillInput,
  now: Date = new Date(),
) {
  const leftMeta = getGroupEmergencyFillMeta(left, now);
  const rightMeta = getGroupEmergencyFillMeta(right, now);

  if (leftMeta.isEmergencyFill !== rightMeta.isEmergencyFill) {
    return leftMeta.isEmergencyFill ? -1 : 1;
  }

  if (!leftMeta.isEmergencyFill || !rightMeta.isEmergencyFill) {
    return 0;
  }

  return (leftMeta.minutesUntilStart ?? 0) - (rightMeta.minutesUntilStart ?? 0);
}
