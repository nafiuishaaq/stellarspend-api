export const AUTH_THROTTLE_TTL = 60_000;
export const AUTH_THROTTLE_LIMIT = 10;
export const AUTH_LOGIN_THROTTLE_LIMIT = 5;
export const NOTIFICATIONS_THROTTLE_LIMIT = 5;

export const AUTH_THROTTLE = {
  default: { limit: AUTH_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL },
} as const;

export const AUTH_LOGIN_THROTTLE = {
  default: { limit: AUTH_LOGIN_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL },
} as const;

export const NOTIFICATIONS_THROTTLE = {
  default: { limit: NOTIFICATIONS_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL },
} as const;
