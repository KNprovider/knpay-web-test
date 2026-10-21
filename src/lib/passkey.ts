// Small browser-only helpers for passkeys (Face ID / fingerprint / Windows Hello).

// Set only once a passkey has really been created on THIS device.
const ENABLED_KEY = 'kn_passkey_enabled';
// Set when the customer taps "Not now" on THIS device.
const DISMISSED_KEY = 'kn_passkey_dismissed';

export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && !!(window as any).PublicKeyCredential;
}

// Does this device have built-in biometrics (Face ID, fingerprint, Windows Hello)?
// A PC without Windows Hello set up returns false, so it never sees the QR/security key dialog.
export async function biometricsAvailable(): Promise<boolean> {
  if (!passkeysSupported()) return false;
  try {
    const pkc: any = (window as any).PublicKeyCredential;
    if (typeof pkc.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') return false;
    return await pkc.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function write(key: string) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // storage can be blocked: ignore
  }
}

// Has a passkey already been turned on for this device?
export function passkeyEnabled(): boolean {
  return read(ENABLED_KEY);
}

export function markPasskeyEnabled() {
  write(ENABLED_KEY);
}

// Has the customer said "Not now" on this device?
export function passkeyDismissed(): boolean {
  return read(DISMISSED_KEY);
}

export function markPasskeyDismissed() {
  write(DISMISSED_KEY);
}
