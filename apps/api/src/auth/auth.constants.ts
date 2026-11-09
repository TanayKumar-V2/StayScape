export const AUTH_COOKIE_ACCESS = 'stayscape_access';
export const AUTH_COOKIE_REFRESH = 'stayscape_refresh';

export const COOKIE_ACCESS_PATH = '/';
export const COOKIE_REFRESH_PATH = '/api/v1/auth';

export const TOKEN_TYPE_ACCESS = 'access';
export const TOKEN_TYPE_REFRESH = 'refresh';

/** 15 minutes in milliseconds */
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

/** 7 days in milliseconds */
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
