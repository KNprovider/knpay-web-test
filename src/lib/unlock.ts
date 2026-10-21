export const UNLOCK_COOKIE = 'kn_unlocked';
export const UNLOCK_SECONDS = 10 * 60; // how long the app stays unlocked after the PIN

export const unlockOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: UNLOCK_SECONDS,
};
