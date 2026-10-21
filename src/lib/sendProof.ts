// A short-lived, signed proof that the customer just confirmed with Face ID / fingerprint.
// Only the server can create it (it is signed with a server secret).

export const SEND_PROOF_COOKIE = 'kn_send_proof';
export const SEND_PROOF_TTL_MS = 5 * 60 * 1000;

async function sign(data: string): Promise<string> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Server secret is missing');

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function makeSendProof(userId: string): Promise<string> {
  const expires = Date.now() + SEND_PROOF_TTL_MS;
  const payload = `${userId}.${expires}`;
  return `${payload}.${await sign(payload)}`;
}

export async function checkSendProof(value: string | undefined, userId: string): Promise<boolean> {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;

  const [uid, expires, signature] = parts;
  if (uid !== userId) return false;
  if (!(Number(expires) > Date.now())) return false;

  return safeEqual(signature, await sign(`${uid}.${expires}`));
}
