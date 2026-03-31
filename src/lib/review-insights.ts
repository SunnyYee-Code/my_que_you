const POSITIVE_REVIEW_TAGS = [
  '准时守约',
  '沟通顺畅',
  '牌品好',
  '组织清晰',
  '新手友好',
  '响应及时',
] as const;

const RISK_REVIEW_TAGS = [
  '迟到',
  '临时取消',
  '沟通困难',
  '节奏拖沓',
] as const;

export const REVIEW_TAG_OPTIONS = [
  ...POSITIVE_REVIEW_TAGS,
  ...RISK_REVIEW_TAGS,
] as const;

export type ReviewTag = (typeof REVIEW_TAG_OPTIONS)[number];

type ReviewInsightInput = {
  id?: string;
  target_id?: string;
  tags?: string[] | null;
};

type GroupInsightInput = {
  id?: string;
  status?: string | null;
  host_id?: string | null;
};

type ExitInsightInput = {
  id?: string;
  exit_type?: string | null;
  user_id?: string;
};

export type FulfillmentProfile = {
  completedCount: number;
  breachCount: number;
  trackedGroupCount: number;
  fulfillmentRate: number | null;
  topPositiveTags: ReviewTag[];
  topRiskTags: ReviewTag[];
};

const reviewTagSet = new Set<string>(REVIEW_TAG_OPTIONS);

export function normalizeReviewTags(tags: string[] | null | undefined): ReviewTag[] {
  if (!Array.isArray(tags)) return [];

  const normalized: ReviewTag[] = [];

  for (const tag of tags) {
    if (!reviewTagSet.has(tag) || normalized.includes(tag as ReviewTag)) continue;
    normalized.push(tag as ReviewTag);
  }

  return normalized.slice(0, 3);
}

function countTopTags(tags: ReviewTag[], bucket: readonly ReviewTag[]) {
  const counts = new Map<ReviewTag, number>();

  for (const tag of tags) {
    if (!bucket.includes(tag)) continue;
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return bucket.indexOf(left[0]) - bucket.indexOf(right[0]);
    })
    .slice(0, 3)
    .map(([tag]) => tag);
}

export function buildFulfillmentProfile(input: {
  userId: string;
  reviews: ReviewInsightInput[];
  groups: GroupInsightInput[];
  exits?: ExitInsightInput[];
}): FulfillmentProfile {
  const completedCount = input.groups.filter(group => group.status === 'COMPLETED').length;
  const breachCount = (input.exits ?? []).filter(exit => exit.user_id === input.userId).length;
  const trackedGroupCount = completedCount + breachCount;
  const fulfillmentRate = trackedGroupCount === 0
    ? null
    : Math.round((completedCount / trackedGroupCount) * 100);

  const tags = input.reviews
    .filter(review => review.target_id === input.userId)
    .flatMap(review => normalizeReviewTags(review.tags));

  return {
    completedCount,
    breachCount,
    trackedGroupCount,
    fulfillmentRate,
    topPositiveTags: countTopTags(tags, POSITIVE_REVIEW_TAGS),
    topRiskTags: countTopTags(tags, RISK_REVIEW_TAGS),
  };
}
