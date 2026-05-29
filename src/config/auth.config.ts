export const jwtAccessSecret = () => process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me';
export const jwtRefreshSecret = () => process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me';
export const jwtAccessExpiresIn = () => process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
export const jwtRefreshExpiresInDays = () => Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS ?? 7);

