import { buildRiskFlags, REAL_NAME_STATUS, type RealNameRestrictionScene, type RestrictionLevel } from '@/lib/real-name-verification';

type SubmissionInput = {
  realName: string;
  idNumber: string;
  duplicateIdHashCount: number;
  reportedUser: boolean;
};

type BackendDecision = 'approved' | 'pending' | 'rejected';

type BackendSnapshotInput = {
  profileStatus: 'unverified' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestStatus: 'pending' | 'approved' | 'rejected' | 'cancelled' | null;
  requestId: string | null;
  rejectReasonCode: string | null;
  rejectReasonText: string | null;
  verifiedAt: string | null;
  lastSubmittedAt: string | null;
  reviewRequired: boolean;
  restrictionLevel: RestrictionLevel;
  restrictionScenes: RealNameRestrictionScene[];
};

export function evaluateRealNameSubmission(input: SubmissionInput) {
  if (!isValidChineseIdNumber(input.idNumber)) {
    return {
      decision: 'rejected' as BackendDecision,
      reviewRequired: false,
      riskFlags: ['invalid_id_number'],
      rejectReasonCode: 'INVALID_ID_NUMBER',
      rejectReasonText: '身份证号格式不正确，请检查后重新提交。',
    };
  }

  const riskFlags = buildRiskFlags({
    duplicateIdHashCount: input.duplicateIdHashCount,
    reportedUser: input.reportedUser,
  });

  if (riskFlags.length > 0) {
    return {
      decision: 'pending' as BackendDecision,
      reviewRequired: true,
      riskFlags,
      rejectReasonCode: null,
      rejectReasonText: null,
    };
  }

  return {
    decision: 'approved' as BackendDecision,
    reviewRequired: false,
    riskFlags: [],
    rejectReasonCode: null,
    rejectReasonText: null,
  };
}

export function buildBackendRealNameSnapshot(input: BackendSnapshotInput) {
  const status = input.requestStatus ?? input.profileStatus;
  const normalizedStatus = status === 'approved' ? REAL_NAME_STATUS.APPROVED : status;

  return {
    status: normalizedStatus,
    display_status_text: getDisplayStatusText(normalizedStatus),
    can_submit: normalizedStatus === REAL_NAME_STATUS.UNVERIFIED || normalizedStatus === REAL_NAME_STATUS.CANCELLED,
    can_resubmit: normalizedStatus === REAL_NAME_STATUS.REJECTED,
    can_cancel: normalizedStatus === REAL_NAME_STATUS.PENDING,
    reject_reason_code: input.rejectReasonCode,
    reject_reason_text: input.rejectReasonText,
    verified_at: input.verifiedAt,
    last_submitted_at: input.lastSubmittedAt,
    current_request_id: input.requestId,
    review_required: input.reviewRequired,
    restriction_level: input.restrictionLevel,
    restriction_scenes: input.restrictionScenes,
  };
}

function getDisplayStatusText(status: BackendSnapshotInput['profileStatus'] | 'approved') {
  switch (status) {
    case 'pending':
      return '审核中';
    case 'approved':
      return '已实名';
    case 'rejected':
      return '认证失败';
    default:
      return '未实名';
  }
}

function isValidChineseIdNumber(idNumber: string) {
  const normalized = idNumber.trim().toUpperCase();
  return /^\d{17}[\dX]$/.test(normalized);
}
