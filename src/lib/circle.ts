/**
 * T15 4.3.3 雀友圈
 * 纯函数业务逻辑：内容校验、话题标签定义、举报原因定义
 */

// ─── 话题标签 ────────────────────────────────────────────────
export const CIRCLE_TOPIC_TAGS = ['约局', '学习', '日常', '战绩', '心得'] as const;
export type CircleTopicTag = (typeof CIRCLE_TOPIC_TAGS)[number];

export const CIRCLE_TOPIC_TAG_COLORS: Record<CircleTopicTag, string> = {
  约局: 'bg-blue-100 text-blue-700 border-blue-200',
  学习: 'bg-purple-100 text-purple-700 border-purple-200',
  日常: 'bg-green-100 text-green-700 border-green-200',
  战绩: 'bg-orange-100 text-orange-700 border-orange-200',
  心得: 'bg-pink-100 text-pink-700 border-pink-200',
};

// ─── 举报原因 ────────────────────────────────────────────────
export const CIRCLE_REPORT_REASONS = [
  '垃圾广告',
  '不文明言论',
  '赌博相关',
  '骚扰他人',
  '虚假信息',
  '其他',
] as const;
export type CircleReportReason = (typeof CIRCLE_REPORT_REASONS)[number];

// ─── 内容校验 ────────────────────────────────────────────────
export const POST_CONTENT_MAX = 500;
export const COMMENT_CONTENT_MAX = 200;

export interface ContentValidationResult {
  valid: boolean;
  error?: string;
}

/** 校验动态内容 */
export function validatePostContent(content: string): ContentValidationResult {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '内容不能为空' };
  }
  if (trimmed.length > POST_CONTENT_MAX) {
    return { valid: false, error: `内容不能超过 ${POST_CONTENT_MAX} 字` };
  }
  return { valid: true };
}

/** 校验评论内容 */
export function validateCommentContent(content: string): ContentValidationResult {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '评论不能为空' };
  }
  if (trimmed.length > COMMENT_CONTENT_MAX) {
    return { valid: false, error: `评论不能超过 ${COMMENT_CONTENT_MAX} 字` };
  }
  return { valid: true };
}

/** 校验话题标签（null 表示不选择话题，合法） */
export function validateTopicTag(tag: string | null | undefined): ContentValidationResult {
  if (tag === null || tag === undefined || tag === '') return { valid: true };
  if (!(CIRCLE_TOPIC_TAGS as readonly string[]).includes(tag)) {
    return { valid: false, error: '无效的话题标签' };
  }
  return { valid: true };
}

// ─── 数据类型 ────────────────────────────────────────────────
export interface CirclePost {
  id: string;
  userId: string;
  content: string;
  topicTag: CircleTopicTag | null;
  likeCount: number;
  commentCount: number;
  isHidden: boolean;
  createdAt: string;
  author: {
    nickname: string;
    avatarUrl: string | null;
    creditScore: number;
  };
  isLikedByMe: boolean;
}

export interface CircleComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  author: {
    nickname: string;
    avatarUrl: string | null;
  };
}

// ─── 格式化辅助 ──────────────────────────────────────────────

/** 将剩余字符数转为提示文字颜色 CSS 类名 */
export function getCharCountClass(current: number, max: number): string {
  const remaining = max - current;
  if (remaining < 0) return 'text-destructive font-medium';
  if (remaining <= 20) return 'text-orange-500';
  return 'text-muted-foreground';
}
