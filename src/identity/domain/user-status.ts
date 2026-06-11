export const USER_STATUSES = ['ACTIVE', 'DEACTIVATED', 'DELETION_REQUESTED'] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

