export const AUTH_ROLES = ['CUSTOMER', 'SELLER', 'SUPPORT', 'ADMIN'] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

