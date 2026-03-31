import { describe, expect, it } from 'vitest';
import { buildGroupSharePosterModel } from '@/lib/group-share-poster';

describe('buildGroupSharePosterModel', () => {
  it('builds poster copy, facts, and deep link from group detail data', () => {
    const model = buildGroupSharePosterModel({
      id: 'group-1',
      address: '成都高新区天府三街 88 号',
      start_time: '2026-04-01T11:30:00.000Z',
      end_time: '2026-04-01T15:30:00.000Z',
      total_slots: 4,
      needed_slots: 1,
      play_style: '血战到底',
      game_note: '禁烟，可带新手',
      hostNickname: '阿哲',
    }, 'https://example.com');

    expect(model.shareLink).toBe('https://example.com/group/group-1?from=poster');
    expect(model.title).toContain('阿哲');
    expect(model.summary).toContain('成都高新区天府三街 88 号');
    expect(model.facts[0]).toContain('时间｜2026年04月01日');
    expect(model.facts[1]).toBe('地点｜成都高新区天府三街 88 号');
    expect(model.facts[2]).toBe('人数｜4人局，还差1人');
    expect(model.facts[3]).toBe('玩法｜血战到底');
    expect(model.shareText).toContain('禁烟，可带新手');
    expect(model.shareText).toContain('https://example.com/group/group-1?from=poster');
    expect(model.fileName).toBe('queyou-group-group-1-share-poster.png');
    expect(model.svgMarkup).toContain('还差1人');
  });

  it('clips overly long notes and summary content to keep poster layout stable', () => {
    const model = buildGroupSharePosterModel({
      id: 'group-2',
      address: '成都市武侯区超长超长超长超长超长超长超长超长超长牌馆包间 302',
      start_time: '2026-04-01T11:30:00.000Z',
      end_time: '2026-04-01T15:30:00.000Z',
      total_slots: 4,
      needed_slots: 2,
      play_style: '血流成河',
      game_note: '备注内容特别长特别长特别长特别长特别长特别长特别长特别长特别长特别长特别长特别长特别长特别长特别长特别长特别长特别长',
      hostNickname: '一位昵称也很长很长的房主',
    }, 'https://example.com');

    expect(model.notes.endsWith('...')).toBe(true);
    expect(model.summary.length).toBeLessThanOrEqual(48);
    expect(model.svgMarkup).toContain('...');
  });
});
