import { describe, expect, it } from 'vitest';
import {
  CIRCLE_TOPIC_TAGS,
  CIRCLE_REPORT_REASONS,
  POST_CONTENT_MAX,
  COMMENT_CONTENT_MAX,
  validatePostContent,
  validateCommentContent,
  validateTopicTag,
  getCharCountClass,
  type CircleTopicTag,
} from '@/lib/circle';

// ─── validatePostContent ─────────────────────────────────────

describe('validatePostContent', () => {
  it('空字符串返回 valid=false', () => {
    expect(validatePostContent('')).toMatchObject({ valid: false });
  });

  it('纯空白字符串返回 valid=false', () => {
    expect(validatePostContent('   ')).toMatchObject({ valid: false });
  });

  it('正常内容返回 valid=true', () => {
    expect(validatePostContent('今天麻将打得不错！')).toMatchObject({ valid: true });
  });

  it('恰好 500 字返回 valid=true', () => {
    const content = 'a'.repeat(POST_CONTENT_MAX);
    expect(validatePostContent(content)).toMatchObject({ valid: true });
  });

  it('超过 500 字返回 valid=false', () => {
    const content = 'a'.repeat(POST_CONTENT_MAX + 1);
    const result = validatePostContent(content);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('500');
  });

  it('error 字段在 valid=false 时存在', () => {
    const result = validatePostContent('');
    expect(result.error).toBeTruthy();
  });

  it('error 字段在 valid=true 时不存在', () => {
    const result = validatePostContent('你好');
    expect(result.error).toBeUndefined();
  });
});

// ─── validateCommentContent ──────────────────────────────────

describe('validateCommentContent', () => {
  it('空字符串返回 valid=false', () => {
    expect(validateCommentContent('')).toMatchObject({ valid: false });
  });

  it('正常评论返回 valid=true', () => {
    expect(validateCommentContent('支持！')).toMatchObject({ valid: true });
  });

  it('恰好 200 字返回 valid=true', () => {
    const content = 'b'.repeat(COMMENT_CONTENT_MAX);
    expect(validateCommentContent(content)).toMatchObject({ valid: true });
  });

  it('超过 200 字返回 valid=false', () => {
    const content = 'b'.repeat(COMMENT_CONTENT_MAX + 1);
    const result = validateCommentContent(content);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('200');
  });
});

// ─── validateTopicTag ────────────────────────────────────────

describe('validateTopicTag', () => {
  it('null 是合法的（不选话题）', () => {
    expect(validateTopicTag(null)).toMatchObject({ valid: true });
  });

  it('undefined 是合法的', () => {
    expect(validateTopicTag(undefined)).toMatchObject({ valid: true });
  });

  it('空字符串是合法的', () => {
    expect(validateTopicTag('')).toMatchObject({ valid: true });
  });

  it.each(CIRCLE_TOPIC_TAGS)('预定义话题 "%s" 合法', (tag) => {
    expect(validateTopicTag(tag)).toMatchObject({ valid: true });
  });

  it('不在列表中的话题返回 valid=false', () => {
    expect(validateTopicTag('赌局')).toMatchObject({ valid: false });
  });

  it('随机字符串返回 valid=false', () => {
    const result = validateTopicTag('123abc');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ─── CIRCLE_TOPIC_TAGS ───────────────────────────────────────

describe('CIRCLE_TOPIC_TAGS', () => {
  it('包含 5 个话题', () => {
    expect(CIRCLE_TOPIC_TAGS).toHaveLength(5);
  });

  it('包含"约局"话题', () => {
    expect(CIRCLE_TOPIC_TAGS).toContain('约局');
  });

  it('包含"战绩"话题', () => {
    expect(CIRCLE_TOPIC_TAGS).toContain('战绩');
  });
});

// ─── CIRCLE_REPORT_REASONS ───────────────────────────────────

describe('CIRCLE_REPORT_REASONS', () => {
  it('至少包含 4 种举报原因', () => {
    expect(CIRCLE_REPORT_REASONS.length).toBeGreaterThanOrEqual(4);
  });

  it('包含"垃圾广告"', () => {
    expect(CIRCLE_REPORT_REASONS).toContain('垃圾广告');
  });

  it('包含"赌博相关"', () => {
    expect(CIRCLE_REPORT_REASONS).toContain('赌博相关');
  });
});

// ─── getCharCountClass ───────────────────────────────────────

describe('getCharCountClass', () => {
  it('剩余字符充足时返回 muted 样式', () => {
    const cls = getCharCountClass(100, 500);
    expect(cls).toContain('muted');
  });

  it('剩余字符 ≤ 20 时返回 orange 样式', () => {
    const cls = getCharCountClass(485, 500); // 剩余 15
    expect(cls).toContain('orange');
  });

  it('超出字数限制时返回 destructive 样式', () => {
    const cls = getCharCountClass(510, 500); // 超出 10
    expect(cls).toContain('destructive');
  });

  it('恰好达到上限（剩余 0）时返回 orange 样式', () => {
    const cls = getCharCountClass(500, 500); // 剩余 0
    expect(cls).toContain('orange');
  });
});
