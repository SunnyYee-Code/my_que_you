import {
  createDefaultRealNameSnapshot,
  getRealNameStatusViewModel,
  normalizeRestrictionScene,
  normalizeRealNameStatus,
  type NormalizedRealNameStatus,
  type RealNameStatusViewModel,
  type RealNameVerificationSnapshot,
  type RealNameRestrictionScene,
  type RestrictionLevel,
} from '@/lib/real-name-verification';

export const REAL_NAME_SCENES = {
  SETTINGS: 'settings',
  GROUP_CREATE: 'group_create',
  GROUP_JOIN: 'group_join',
} as const;

export const REAL_NAME_FORM_FIELDS = {
  REAL_NAME: 'real_name',
  ID_NUMBER: 'id_number',
  CONSENT_CHECKED: 'consent_checked',
} as const;

const ALLOWED_RESTRICTION_LEVELS: RestrictionLevel[] = ['none', 'prompt_only', 'limited', 'blocked'];
const ALLOWED_REAL_NAME_STATUSES = ['unverified', 'pending', 'approved', 'rejected', 'cancelled', 'verified'] as const;
type AllowedRealNameStatus = (typeof ALLOWED_REAL_NAME_STATUSES)[number];

export const REAL_NAME_STATUS_ORDER: NormalizedRealNameStatus[] = ['unverified', 'pending', 'verified', 'rejected'];

export const REAL_NAME_STATUS_ACTIONS: Record<NormalizedRealNameStatus, {
  primaryLabel: string;
  showSubmitForm: boolean;
  allowCancel: boolean;
  allowResubmit: boolean;
}> = {
  unverified: { primaryLabel: '提交认证', showSubmitForm: true, allowCancel: false, allowResubmit: false },
  pending: { primaryLabel: '审核中', showSubmitForm: false, allowCancel: true, allowResubmit: false },
  verified: { primaryLabel: '已实名认证', showSubmitForm: false, allowCancel: false, allowResubmit: false },
  rejected: { primaryLabel: '重新提交', showSubmitForm: true, allowCancel: false, allowResubmit: true },
};

export const REAL_NAME_COPY = {
  sectionTitle: '实名认证',
  formDescription: '用于完成平台实名认证。提交后系统会结合风险规则自动通过或进入人工审核。',
  realNameLabel: '真实姓名',
  realNamePlaceholder: '请输入真实姓名',
  idNumberLabel: '身份证号',
  idNumberPlaceholder: '请输入身份证号',
  consentLabel: '我已知晓并同意平台用于实名认证校验',
  statusLabel: '当前状态',
  rejectReasonLabel: '驳回原因',
  submittedAtLabel: '最近提交时间',
  verifiedAtLabel: '通过时间',
  submitSuccessTitle: '实名认证提交成功',
  submitSuccessDescription: '资料已提交，等待平台审核。',
  cancelSuccessTitle: '已撤销实名认证申请',
  cancelSuccessDescription: '当前已恢复为未实名状态。',
} as const;

export type RealNameAdapterRow = Partial<Record<string, unknown>> | null | undefined;

function asRestrictionScenes(value: unknown): RealNameRestrictionScene[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => normalizeRestrictionScene(item))
    .filter((item): item is RealNameRestrictionScene => Boolean(item));
  return Array.from(new Set(normalized));
}

function asAllowedStatus(value: unknown, fallback: AllowedRealNameStatus): AllowedRealNameStatus {
  if (typeof value !== 'string') return fallback;
  return ALLOWED_REAL_NAME_STATUSES.includes(value as AllowedRealNameStatus)
    ? (value as AllowedRealNameStatus)
    : fallback;
}

export function adaptRealNameSnapshot(row: RealNameAdapterRow): RealNameVerificationSnapshot {
  const fallback = createDefaultRealNameSnapshot();
  if (!row) return fallback;

  const status = asAllowedStatus(row.status, fallback.status);
  const restrictionLevel = typeof row.restriction_level === 'string' && ALLOWED_RESTRICTION_LEVELS.includes(row.restriction_level as RestrictionLevel)
    ? (row.restriction_level as RestrictionLevel)
    : fallback.restriction_level;

  return {
    status,
    display_status_text: typeof row.display_status_text === 'string' ? row.display_status_text : fallback.display_status_text,
    can_submit: typeof row.can_submit === 'boolean' ? row.can_submit : fallback.can_submit,
    can_resubmit: typeof row.can_resubmit === 'boolean' ? row.can_resubmit : fallback.can_resubmit,
    can_cancel: typeof row.can_cancel === 'boolean' ? row.can_cancel : fallback.can_cancel,
    reject_reason_text: typeof row.reject_reason_text === 'string' ? row.reject_reason_text : fallback.reject_reason_text,
    reject_reason_code: typeof row.reject_reason_code === 'string' ? row.reject_reason_code : fallback.reject_reason_code,
    verified_at: typeof row.verified_at === 'string' ? row.verified_at : fallback.verified_at,
    last_submitted_at: typeof row.last_submitted_at === 'string' ? row.last_submitted_at : fallback.last_submitted_at,
    current_request_id: typeof row.current_request_id === 'string' ? row.current_request_id : fallback.current_request_id,
    review_required: typeof row.review_required === 'boolean' ? row.review_required : fallback.review_required,
    restriction_level: restrictionLevel,
    restriction_scenes: asRestrictionScenes(row.restriction_scenes),
  };
}

export function buildRealNameViewModel(row: RealNameAdapterRow): RealNameStatusViewModel {
  return getRealNameStatusViewModel(adaptRealNameSnapshot(row));
}

export function getRealNameStatusActions(row: RealNameAdapterRow) {
  const snapshot = adaptRealNameSnapshot(row);
  return REAL_NAME_STATUS_ACTIONS[normalizeRealNameStatus(snapshot.status)];
}
