import { ACCOUNT_DELETION_STATUS, type AccountDeletionSnapshot } from '@/constants/accountDeletion';

export type AccountDeletionAction = 'apply' | 'cancel';

export type AccountDeletionDomainState = {
  applyStatus: AccountDeletionSnapshot['applyStatus'];
  coolingOffExpireAt: string | null;
  resultReason: string;
  updatedAt: string | null;
  hasActiveGroups?: boolean;
  hasPendingSettlements?: boolean;
};

export type AccountDeletionProcessingState = {
  status: AccountDeletionSnapshot['applyStatus'];
  coolingOffExpireAt: string | null;
  deletedAt: string | null;
};

export const ACCOUNT_DELETION_ERROR = {
  ACTIVE_GROUPS: {
    code: 'ACCOUNT_DELETION_ACTIVE_GROUPS',
    message: '你有进行中的牌局，暂不可申请注销',
  },
  PENDING_SETTLEMENTS: {
    code: 'ACCOUNT_DELETION_PENDING_SETTLEMENTS',
    message: '你有待处理事项，暂不可申请注销',
  },
  INVALID_APPLY_STATUS: {
    code: 'ACCOUNT_DELETION_INVALID_APPLY_STATUS',
    message: '当前状态不可重复申请注销',
  },
  INVALID_CANCEL_STATUS: {
    code: 'ACCOUNT_DELETION_INVALID_CANCEL_STATUS',
    message: '当前状态不可撤销注销申请',
  },
} as const;

const APPLYABLE_STATUSES = new Set([
  ACCOUNT_DELETION_STATUS.NOT_APPLIED,
  ACCOUNT_DELETION_STATUS.CANCELLED,
  ACCOUNT_DELETION_STATUS.REJECTED,
]);

const CANCELLABLE_STATUSES = new Set([
  ACCOUNT_DELETION_STATUS.COOLING_OFF,
]);

export function buildAccountDeletionSnapshot(state: AccountDeletionDomainState): AccountDeletionSnapshot & {
  availableActions: AccountDeletionAction[];
  updatedAt: string | null;
} {
  const forbiddenReason = getForbiddenReason(state);
  const canOperate = !forbiddenReason;

  return {
    applyStatus: state.applyStatus,
    canOperate,
    forbiddenReason,
    coolingOffExpireAt: state.coolingOffExpireAt,
    resultReason: state.resultReason ?? '',
    availableActions: getAvailableActions(state.applyStatus, canOperate),
    updatedAt: state.updatedAt,
  };
}

export function validateApplyEligibility(state: AccountDeletionDomainState) {
  const forbiddenReason = getForbiddenReason(state);
  if (forbiddenReason) {
    const error = state.hasActiveGroups
      ? ACCOUNT_DELETION_ERROR.ACTIVE_GROUPS
      : ACCOUNT_DELETION_ERROR.PENDING_SETTLEMENTS;
    return { ok: false as const, error };
  }

  if (!APPLYABLE_STATUSES.has(state.applyStatus)) {
    return { ok: false as const, error: ACCOUNT_DELETION_ERROR.INVALID_APPLY_STATUS };
  }

  return { ok: true as const };
}

export function validateCancelEligibility(state: AccountDeletionDomainState) {
  if (!CANCELLABLE_STATUSES.has(state.applyStatus)) {
    return { ok: false as const, error: ACCOUNT_DELETION_ERROR.INVALID_CANCEL_STATUS };
  }

  return { ok: true as const };
}

export function calculateCoolingOffExpireAt(now: Date, days = 15) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function shouldFinalizeDeletion(state: AccountDeletionProcessingState, now: Date) {
  if (state.status !== ACCOUNT_DELETION_STATUS.COOLING_OFF) return false;
  if (!state.coolingOffExpireAt || state.deletedAt) return false;
  return new Date(state.coolingOffExpireAt).getTime() <= now.getTime();
}

export function buildFinalizeDeletionPatch({ userId, deletedAt }: { userId: string; deletedAt: string; }) {
  return {
    requestUpdate: {
      status: ACCOUNT_DELETION_STATUS.COMPLETED,
      deleted_at: deletedAt,
      result_reason: '冷静期结束，系统已自动完成账号注销',
      forbidden_reason: null,
    },
    profileUpdate: {
      is_banned: true,
      can_create_group: false,
      can_join_group: false,
      deletion_status: ACCOUNT_DELETION_STATUS.COMPLETED,
      deletion_completed_at: deletedAt,
      deleted_at: deletedAt,
      deletion_requested_at: deletedAt,
      nickname: '已注销用户',
      avatar_url: null,
      phone: null,
      city_id: null,
      onboarding_completed: false,
      require_email_verification: false,
      updated_at: deletedAt,
    },
    authUpdate: {
      ban_duration: '876000h',
      user_metadata: {
        deletion_status: ACCOUNT_DELETION_STATUS.COMPLETED,
        deleted: true,
        nickname: '已注销用户',
        deleted_at: deletedAt,
        deleted_user_id: userId,
      },
    },
    auditDetail: {
      toStatus: ACCOUNT_DELETION_STATUS.COMPLETED,
      deletedAt,
      processor: 'auto-finalize-account-deletion',
    },
  };
}

function getForbiddenReason(state: AccountDeletionDomainState) {
  if (state.hasActiveGroups) return ACCOUNT_DELETION_ERROR.ACTIVE_GROUPS.message;
  if (state.hasPendingSettlements) return ACCOUNT_DELETION_ERROR.PENDING_SETTLEMENTS.message;
  return '';
}

function getAvailableActions(status: AccountDeletionSnapshot['applyStatus'], canOperate: boolean): AccountDeletionAction[] {
  if (status === ACCOUNT_DELETION_STATUS.COOLING_OFF) return ['cancel'];
  if (canOperate && APPLYABLE_STATUSES.has(status)) return ['apply'];
  return [];
}
