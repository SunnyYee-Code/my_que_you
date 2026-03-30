export const REAL_NAME_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  VERIFIED: 'verified',
} as const;

export type NormalizedRealNameStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type RealNameBackendStatus = NormalizedRealNameStatus | 'approved' | 'cancelled';
export type RestrictionLevel = 'none' | 'prompt_only' | 'limited' | 'blocked';
export type RealNameRestrictionScene = 'group_create' | 'group_join' | 'settings';

const LEGACY_RESTRICTION_SCENE_MAP: Record<string, RealNameRestrictionScene> = {
  create_group: 'group_create',
  join_group: 'group_join',
  group_create: 'group_create',
  group_join: 'group_join',
  settings: 'settings',
};

export const REAL_NAME_ERROR = {
  INVALID_SUBMIT_STATUS: {
    code: 'REAL_NAME_INVALID_SUBMIT_STATUS',
    message: '当前状态不可提交实名认证',
  },
  INVALID_RESUBMIT_STATUS: {
    code: 'REAL_NAME_INVALID_RESUBMIT_STATUS',
    message: '当前状态不可重新提交实名认证',
  },
  INVALID_CANCEL_STATUS: {
    code: 'REAL_NAME_INVALID_CANCEL_STATUS',
    message: '当前状态不可撤回实名认证申请',
  },
  PENDING_REQUEST_EXISTS: {
    code: 'REAL_NAME_PENDING_REQUEST_EXISTS',
    message: '当前已有待审核实名认证申请',
  },
} as const;

export type RealNameVerificationSnapshot = {
  status: RealNameBackendStatus;
  display_status_text: string | null;
  can_submit: boolean;
  can_resubmit: boolean;
  can_cancel: boolean;
  reject_reason_text: string | null;
  reject_reason_code?: string | null;
  verified_at: string | null;
  last_submitted_at: string | null;
  current_request_id?: string | null;
  review_required?: boolean;
  restriction_level: RestrictionLevel;
  restriction_scenes: RealNameRestrictionScene[];
};

export type RealNameStatusState = {
  status: Extract<RealNameBackendStatus, 'unverified' | 'pending' | 'approved' | 'rejected' | 'cancelled'>;
  reviewRequired: boolean;
  rejectReasonCode: string | null;
  rejectReasonText: string | null;
  verifiedAt: string | null;
  lastSubmittedAt: string | null;
  currentRequestId: string | null;
  restrictionScenes: string[];
};

export type RealNameStatusViewModel = {
  status: NormalizedRealNameStatus;
  badgeText: string;
  description: string;
  canSubmit: boolean;
  canResubmit: boolean;
  canCancel: boolean;
  rejectReasonText: string | null;
  verifiedAt: string | null;
  lastSubmittedAt: string | null;
  restrictionLevel: RestrictionLevel;
  restrictionScenes: RealNameRestrictionScene[];
  isVerified: boolean;
  isPending: boolean;
};

const DEFAULT_STATUS_TEXT: Record<NormalizedRealNameStatus, string> = {
  unverified: '未实名',
  pending: '审核中',
  verified: '已实名',
  rejected: '认证失败',
};

const DEFAULT_DESCRIPTION: Record<NormalizedRealNameStatus, string> = {
  unverified: '完成实名认证后，可解锁受限业务场景。',
  pending: '实名认证资料已提交，等待平台审核。',
  verified: '你的实名认证已通过审核。',
  rejected: '实名认证未通过，请根据原因修正后重新提交。',
};

export function normalizeRealNameStatus(status: RealNameBackendStatus): NormalizedRealNameStatus {
  if (status === REAL_NAME_STATUS.APPROVED) return REAL_NAME_STATUS.VERIFIED;
  if (status === REAL_NAME_STATUS.CANCELLED) return REAL_NAME_STATUS.UNVERIFIED;
  return status;
}

export function buildRealNameStatusSnapshot(state: RealNameStatusState) {
  const normalizedStatus = normalizeRealNameStatus(state.status);
  const restrictionLevel = getRestrictionLevel(state.status, state.restrictionScenes);
  return {
    status: state.status,
    displayStatusText: DEFAULT_STATUS_TEXT[normalizedStatus],
    canSubmit: state.status === REAL_NAME_STATUS.UNVERIFIED || state.status === REAL_NAME_STATUS.CANCELLED,
    canResubmit: state.status === REAL_NAME_STATUS.REJECTED,
    canCancel: state.status === REAL_NAME_STATUS.PENDING,
    isVerified: normalizedStatus === REAL_NAME_STATUS.VERIFIED,
    isPending: normalizedStatus === REAL_NAME_STATUS.PENDING,
    reviewRequired: state.reviewRequired,
    rejectReasonCode: state.rejectReasonCode,
    rejectReasonText: state.rejectReasonText,
    verifiedAt: state.verifiedAt,
    lastSubmittedAt: state.lastSubmittedAt,
    currentRequestId: state.currentRequestId,
    restrictionLevel,
    restrictionScenes: state.restrictionScenes,
  };
}

export function getRealNameStatusViewModel(snapshot: RealNameVerificationSnapshot): RealNameStatusViewModel {
  const status = normalizeRealNameStatus(snapshot.status);
  const badgeText = snapshot.display_status_text?.trim() || DEFAULT_STATUS_TEXT[status];

  return {
    status,
    badgeText,
    description: DEFAULT_DESCRIPTION[status],
    canSubmit: snapshot.can_submit,
    canResubmit: snapshot.can_resubmit,
    canCancel: snapshot.can_cancel,
    rejectReasonText: snapshot.reject_reason_text,
    verifiedAt: snapshot.verified_at,
    lastSubmittedAt: snapshot.last_submitted_at,
    restrictionLevel: snapshot.restriction_level,
    restrictionScenes: snapshot.restriction_scenes,
    isVerified: status === REAL_NAME_STATUS.VERIFIED,
    isPending: status === REAL_NAME_STATUS.PENDING,
  };
}

export function validateSubmitEligibility(input: { status: RealNameStatusState['status']; hasPendingRequest: boolean }) {
  if (input.hasPendingRequest) return { ok: false as const, error: REAL_NAME_ERROR.PENDING_REQUEST_EXISTS };
  if (![REAL_NAME_STATUS.UNVERIFIED, REAL_NAME_STATUS.CANCELLED].includes(input.status)) {
    return { ok: false as const, error: REAL_NAME_ERROR.INVALID_SUBMIT_STATUS };
  }
  return { ok: true as const };
}

export function validateResubmitEligibility(input: { status: RealNameStatusState['status'] }) {
  if (input.status !== REAL_NAME_STATUS.REJECTED) {
    return { ok: false as const, error: REAL_NAME_ERROR.INVALID_RESUBMIT_STATUS };
  }
  return { ok: true as const };
}

export function validateCancelEligibility(input: { status: RealNameStatusState['status'] }) {
  if (input.status !== REAL_NAME_STATUS.PENDING) {
    return { ok: false as const, error: REAL_NAME_ERROR.INVALID_CANCEL_STATUS };
  }
  return { ok: true as const };
}

export function shouldBlockByRestrictionLevel(level: RestrictionLevel) {
  return level === 'blocked' || level === 'limited';
}

export function shouldShowRealNameGuard(snapshot: RealNameVerificationSnapshot, scene: string) {
  const normalizedScene = normalizeRestrictionScene(scene);
  if (!normalizedScene || snapshot.restriction_level === 'none') return false;

  const normalizedScenes = snapshot.restriction_scenes
    .map((item) => normalizeRestrictionScene(item))
    .filter((item): item is RealNameRestrictionScene => Boolean(item));

  if (normalizedScenes.length === 0) {
    return true;
  }

  return normalizedScenes.includes(normalizedScene);
}

export function getRealNameRestrictionHint(snapshot: RealNameVerificationSnapshot, scene: string) {
  if (!shouldShowRealNameGuard(snapshot, scene)) return null;
  if (shouldBlockByRestrictionLevel(snapshot.restriction_level)) {
    return '当前场景需先完成实名认证后继续。';
  }
  return '当前场景建议先完成实名认证，以获得完整使用权限。';
}

export function createDefaultRealNameSnapshot(): RealNameVerificationSnapshot {
  return {
    status: 'unverified',
    display_status_text: '未实名',
    can_submit: true,
    can_resubmit: false,
    can_cancel: false,
    reject_reason_text: null,
    reject_reason_code: null,
    verified_at: null,
    last_submitted_at: null,
    current_request_id: null,
    review_required: false,
    restriction_level: 'limited',
    restriction_scenes: ['group_create', 'group_join'],
  };
}

export function canCreateRealNamePendingRequest(requests: Array<{ status: string }>) {
  return !requests.some((request) => request.status === REAL_NAME_STATUS.PENDING);
}

export function maskIdNumber(idNumber: string) {
  if (idNumber.length <= 8) return idNumber;
  return `${idNumber.slice(0, 6)}********${idNumber.slice(-4)}`;
}

export function buildRiskFlags(input: { duplicateIdHashCount: number; reportedUser: boolean }) {
  const flags: string[] = [];
  if (input.duplicateIdHashCount > 0) flags.push('duplicate_id_hash');
  if (input.reportedUser) flags.push('reported_user');
  return flags;
}

function getRestrictionLevel(status: RealNameStatusState['status'], scenes: string[]): RestrictionLevel {
  if (status === REAL_NAME_STATUS.APPROVED) return 'none';
  if (scenes.length === 0) return 'prompt_only';
  return 'limited';
}

export function normalizeRestrictionScene(scene: string | null | undefined): RealNameRestrictionScene | null {
  if (!scene) return null;
  return LEGACY_RESTRICTION_SCENE_MAP[scene] ?? null;
}
