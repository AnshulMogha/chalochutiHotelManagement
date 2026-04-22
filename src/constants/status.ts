/**
 * Status Constants and Utilities
 */

export const ACCOUNT_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export type AccountStatus = (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  [ACCOUNT_STATUS.ACTIVE]: "Active",
  [ACCOUNT_STATUS.INACTIVE]: "Inactive",
  [ACCOUNT_STATUS.SUSPENDED]: "Suspended",
};

export const ACCOUNT_STATUS_OPTIONS = [
  { value: ACCOUNT_STATUS.ACTIVE, label: ACCOUNT_STATUS_LABELS[ACCOUNT_STATUS.ACTIVE] },
  { value: ACCOUNT_STATUS.INACTIVE, label: ACCOUNT_STATUS_LABELS[ACCOUNT_STATUS.INACTIVE] },
  { value: ACCOUNT_STATUS.SUSPENDED, label: ACCOUNT_STATUS_LABELS[ACCOUNT_STATUS.SUSPENDED] },
] as const;

export const ACCOUNT_STATUS_CONFIG: Record<
  AccountStatus,
  { label: string; icon: string; className: string }
> = {
  [ACCOUNT_STATUS.ACTIVE]: {
    label: "Active",
    icon: "check",
    className: "bg-green-100 text-green-700",
  },
  [ACCOUNT_STATUS.INACTIVE]: {
    label: "Inactive",
    icon: "x",
    className: "bg-gray-100 text-gray-700",
  },
  [ACCOUNT_STATUS.SUSPENDED]: {
    label: "Suspended",
    icon: "alert",
    className: "bg-red-100 text-red-700",
  },
};

