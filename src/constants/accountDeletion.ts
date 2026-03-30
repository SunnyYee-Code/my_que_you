export const ACCOUNT_DELETION_STATUS = {
  NOT_APPLIED: 'not_applied',
  COOLING_OFF: 'cooling_off',
  PROCESSING: 'processing',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

export type AccountDeletionStatus = typeof ACCOUNT_DELETION_STATUS[keyof typeof ACCOUNT_DELETION_STATUS];

export type AccountDeletionSnapshot = {
  applyStatus: AccountDeletionStatus;
  canOperate: boolean;
  forbiddenReason: string;
  coolingOffExpireAt: string | null;
  resultReason: string;
};

export const DEFAULT_ACCOUNT_DELETION_SNAPSHOT: AccountDeletionSnapshot = {
  applyStatus: ACCOUNT_DELETION_STATUS.NOT_APPLIED,
  canOperate: true,
  forbiddenReason: '',
  coolingOffExpireAt: null,
  resultReason: '',
};
