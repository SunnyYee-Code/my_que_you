import { describe, expect, it } from 'vitest';
import {
  inferPreferredPlayStyles,
  sortGroupsByRecommendation,
} from '../group-recommendation';

type RecommendationTestGroup = {
  id?: string;
  host_id?: string;
  status?: string;
  start_time?: string;
  created_at?: string;
  play_style?: string | null;
  needed_slots?: number;
  total_slots?: number;
  members?: Array<{ user_id: string }>;
  distance?: number | null;
};

function makeGroup(overrides: RecommendationTestGroup = {}) {
  return {
    id: overrides.id ?? 'group-1',
    host_id: overrides.host_id ?? 'host-1',
    status: overrides.status ?? 'OPEN',
    start_time: overrides.start_time ?? '2026-03-30T18:00:00+08:00',
    created_at: overrides.created_at ?? '2026-03-29T10:00:00+08:00',
    play_style: overrides.play_style ?? null,
    needed_slots: overrides.needed_slots ?? 2,
    total_slots: overrides.total_slots ?? 4,
    members: overrides.members ?? [],
    distance: overrides.distance ?? null,
  };
}

describe('group recommendation ranking', () => {
  const now = new Date('2026-03-30T10:00:00+08:00');

  it('prefers nearer groups when other factors are equal', () => {
    const ranked = sortGroupsByRecommendation(
      [
        makeGroup({ id: 'far', distance: 9 }),
        makeGroup({ id: 'near', distance: 0.8 }),
      ],
      { now, preferredPlayStyles: [] },
    );

    expect(ranked.map(group => group.id)).toEqual(['near', 'far']);
  });

  it('prefers earlier upcoming groups when distance is tied', () => {
    const ranked = sortGroupsByRecommendation(
      [
        makeGroup({ id: 'later', distance: 2, start_time: '2026-03-30T21:00:00+08:00' }),
        makeGroup({ id: 'sooner', distance: 2, start_time: '2026-03-30T13:00:00+08:00' }),
      ],
      { now, preferredPlayStyles: [] },
    );

    expect(ranked.map(group => group.id)).toEqual(['sooner', 'later']);
  });

  it('boosts groups that match inferred play style preferences', () => {
    const preferredPlayStyles = inferPreferredPlayStyles(
      [
        makeGroup({
          id: 'history-1',
          status: 'FULL',
          play_style: '血战到底',
          members: [{ user_id: 'user-1' }],
        }),
        makeGroup({
          id: 'history-2',
          status: 'IN_PROGRESS',
          play_style: '血战到底',
          host_id: 'user-1',
        }),
      ],
      'user-1',
    );

    const ranked = sortGroupsByRecommendation(
      [
        makeGroup({
          id: 'other-style',
          distance: 1,
          start_time: '2026-03-30T15:00:00+08:00',
          play_style: '血流成河',
        }),
        makeGroup({
          id: 'preferred-style',
          distance: 3,
          start_time: '2026-03-30T16:00:00+08:00',
          play_style: '血战到底',
        }),
      ],
      { now, preferredPlayStyles },
    );

    expect(preferredPlayStyles).toEqual(['血战到底']);
    expect(ranked.map(group => group.id)).toEqual(['preferred-style', 'other-style']);
  });

  it('ignores open groups when inferring play style preferences', () => {
    const preferredPlayStyles = inferPreferredPlayStyles(
      [
        makeGroup({
          id: 'open-current',
          status: 'OPEN',
          play_style: '血流成河',
          members: [{ user_id: 'user-1' }],
        }),
        makeGroup({
          id: 'history-completed',
          status: 'COMPLETED',
          play_style: '血战到底',
          members: [{ user_id: 'user-1' }],
        }),
      ],
      'user-1',
    );

    expect(preferredPlayStyles).toEqual(['血战到底']);
  });

  it('falls back to time and freshness when distance and preference are unavailable', () => {
    const ranked = sortGroupsByRecommendation(
      [
        makeGroup({
          id: 'newer-later',
          distance: null,
          start_time: '2026-03-31T12:00:00+08:00',
          created_at: '2026-03-30T09:00:00+08:00',
        }),
        makeGroup({
          id: 'older-sooner',
          distance: null,
          start_time: '2026-03-30T20:00:00+08:00',
          created_at: '2026-03-28T09:00:00+08:00',
        }),
      ],
      { now, preferredPlayStyles: [] },
    );

    expect(ranked.map(group => group.id)).toEqual(['older-sooner', 'newer-later']);
  });

  it('keeps open groups ahead of full history groups in recommended ranking', () => {
    const ranked = sortGroupsByRecommendation(
      [
        makeGroup({
          id: 'history-full',
          status: 'FULL',
          play_style: '血战到底',
          distance: 0.2,
          start_time: '2026-03-30T12:00:00+08:00',
        }),
        makeGroup({
          id: 'joinable-open',
          status: 'OPEN',
          play_style: '血战到底',
          distance: 3,
          start_time: '2026-03-30T16:00:00+08:00',
        }),
      ],
      { now, preferredPlayStyles: ['血战到底'] },
    );

    expect(ranked.map(group => group.id)).toEqual(['joinable-open', 'history-full']);
  });

  it('keeps emergency fill groups ahead of higher scoring normal groups', () => {
    const ranked = sortGroupsByRecommendation(
      [
        makeGroup({
          id: 'normal-best',
          distance: 0.5,
          start_time: '2026-03-30T12:00:00+08:00',
          play_style: '血战到底',
        }),
        makeGroup({
          id: 'emergency-fill',
          distance: 8,
          start_time: '2026-03-30T10:45:00+08:00',
          needed_slots: 1,
        }),
      ],
      { now, preferredPlayStyles: ['血流成河'] },
    );

    expect(ranked.map(group => group.id)).toEqual(['emergency-fill', 'normal-best']);
  });
});
