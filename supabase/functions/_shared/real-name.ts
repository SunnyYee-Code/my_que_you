export const REAL_NAME_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const REAL_NAME_SCENES = ['group_create', 'group_join'] as const;

export type BackendSnapshot = {
  status: string;
  display_status_text: string;
  can_submit: boolean;
  can_resubmit: boolean;
  can_cancel: boolean;
  reject_reason_code: string | null;
  reject_reason_text: string | null;
  verified_at: string | null;
  last_submitted_at: string | null;
  current_request_id: string | null;
  review_required: boolean;
  restriction_level: 'none' | 'prompt_only' | 'limited' | 'blocked';
  restriction_scenes: string[];
};

export function evaluateSubmission(input: {
  idNumber: string;
  duplicateIdHashCount: number;
  reportedUser: boolean;
}) {
  if (!/^\d{17}[\dXx]$/.test(input.idNumber.trim())) {
    return {
      decision: REAL_NAME_STATUS.REJECTED,
      reviewRequired: false,
      riskFlags: ['invalid_id_number'],
      rejectReasonCode: 'INVALID_ID_NUMBER',
      rejectReasonText: '身份证号格式不正确，请检查后重新提交。',
    };
  }

  const riskFlags: string[] = [];
  if (input.duplicateIdHashCount > 0) riskFlags.push('duplicate_id_hash');
  if (input.reportedUser) riskFlags.push('reported_user');

  if (riskFlags.length > 0) {
    return {
      decision: REAL_NAME_STATUS.PENDING,
      reviewRequired: true,
      riskFlags,
      rejectReasonCode: null,
      rejectReasonText: null,
    };
  }

  return {
    decision: REAL_NAME_STATUS.APPROVED,
    reviewRequired: false,
    riskFlags,
    rejectReasonCode: null,
    rejectReasonText: null,
  };
}

export function buildSnapshot(input: {
  status: string;
  verifiedAt: string | null;
  lastSubmittedAt: string | null;
  requestId: string | null;
  reviewRequired: boolean;
  rejectReasonCode: string | null;
  rejectReasonText: string | null;
}) : BackendSnapshot {
  const restrictionLevel = input.status === REAL_NAME_STATUS.APPROVED ? 'none' : 'limited';
  const restrictionScenes = input.status === REAL_NAME_STATUS.APPROVED ? [] : [...REAL_NAME_SCENES];

  return {
    status: input.status,
    display_status_text: getDisplayStatusText(input.status),
    can_submit: input.status === REAL_NAME_STATUS.UNVERIFIED || input.status === REAL_NAME_STATUS.CANCELLED,
    can_resubmit: input.status === REAL_NAME_STATUS.REJECTED,
    can_cancel: input.status === REAL_NAME_STATUS.PENDING,
    reject_reason_code: input.rejectReasonCode,
    reject_reason_text: input.rejectReasonText,
    verified_at: input.verifiedAt,
    last_submitted_at: input.lastSubmittedAt,
    current_request_id: input.requestId,
    review_required: input.reviewRequired,
    restriction_level: restrictionLevel,
    restriction_scenes: restrictionScenes,
  };
}

export async function sha256Hex(input: string) {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function maskIdNumber(idNumber: string) {
  const normalized = idNumber.trim().toUpperCase();
  if (normalized.length <= 8) return normalized;
  return `${normalized.slice(0, 6)}********${normalized.slice(-4)}`;
}

export async function encryptSensitiveText(value: string) {
  const rawKey = Deno.env.get('REAL_NAME_ENCRYPTION_KEY');
  if (!rawKey) throw new Error('REAL_NAME_ENCRYPTION_KEY is not configured');

  const keyBytes = base64ToBytes(rawKey);
  if (keyBytes.byteLength !== 32) throw new Error('REAL_NAME_ENCRYPTION_KEY must be base64-encoded 32 bytes');

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    new TextEncoder().encode(value.trim()),
  );

  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`;
}

function getDisplayStatusText(status: string) {
  switch (status) {
    case REAL_NAME_STATUS.PENDING:
      return '审核中';
    case REAL_NAME_STATUS.APPROVED:
      return '已实名';
    case REAL_NAME_STATUS.REJECTED:
      return '认证失败';
    default:
      return '未实名';
  }
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function bytesToBase64(value: Uint8Array) {
  return btoa(String.fromCharCode(...value));
}
