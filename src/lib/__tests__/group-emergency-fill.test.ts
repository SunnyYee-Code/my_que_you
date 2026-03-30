import { describe, expect, it } from 'vitest';
import {
  compareGroupsByEmergencyFill,
  EMERGENCY_FILL_MAX_MINUTES,
  EMERGENCY_FILL_MAX_NEEDED_SLOTS,
  getGroupEmergencyFillMeta,
} from '@/lib/group-emergency-fill';

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    status: 'OPEN',
    needed_slots: 1,
    start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

describe('group emergency fill helpers', () => {
  it('marks near-term open groups with open slots as emergency fill candidates', () => {
    const meta = getGroupEmergencyFillMeta(
      buildInput({
        needed_slots: EMERGENCY_FILL_MAX_NEEDED_SLOTS,
        start_time: new Date(Date.now() + (EMERGENCY_FILL_MAX_MINUTES - 5) * 60 * 1000).toISOString(),
      }),
    );

    expect(meta.isEmergencyFill).toBe(true);
    expect(meta.badgeText).toBe('紧急补位');
    expect(meta.actionText).toBe('立即补位');
    expect(meta.countdownText).toContain('分钟内开局');
  });

  it('does not mark far-future groups as emergency fill candidates', () => {
    const meta = getGroupEmergencyFillMeta(
      buildInput({
        start_time: new Date(Date.now() + (EMERGENCY_FILL_MAX_MINUTES + 30) * 60 * 1000).toISOString(),
      }),
    );

    expect(meta.isEmergencyFill).toBe(false);
    expect(meta.badgeText).toBeNull();
  });

  it('does not mark closed or past groups as emergency fill candidates', () => {
    expect(
      getGroupEmergencyFillMeta(buildInput({ status: 'FULL' })).isEmergencyFill,
    ).toBe(false);
    expect(
      getGroupEmergencyFillMeta(
        buildInput({ start_time: new Date(Date.now() - 10 * 60 * 1000).toISOString() }),
      ).isEmergencyFill,
    ).toBe(false);
  });

  it('treats sub-minute upcoming groups as emergency fill but excludes groups just beyond the max window', () => {
    const justUnderOneMinute = getGroupEmergencyFillMeta(
      buildInput({
        start_time: new Date(Date.now() + 30 * 1000).toISOString(),
      }),
    );
    const justOverWindow = getGroupEmergencyFillMeta(
      buildInput({
        start_time: new Date(Date.now() + (EMERGENCY_FILL_MAX_MINUTES * 60 + 30) * 1000).toISOString(),
      }),
    );

    expect(justUnderOneMinute.isEmergencyFill).toBe(true);
    expect(justUnderOneMinute.minutesUntilStart).toBe(1);
    expect(justOverWindow.isEmergencyFill).toBe(false);
  });

  it('sorts emergency fill groups ahead of normal groups and by earlier start time', () => {
    const normalGroup = buildInput({
      start_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    });
    const emergencyLater = buildInput({
      start_time: new Date(Date.now() + 80 * 60 * 1000).toISOString(),
    });
    const emergencySooner = buildInput({
      start_time: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    });

    expect(compareGroupsByEmergencyFill(emergencySooner, normalGroup)).toBeLessThan(0);
    expect(compareGroupsByEmergencyFill(emergencySooner, emergencyLater)).toBeLessThan(0);
  });
});
