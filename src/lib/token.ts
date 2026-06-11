import crypto from 'node:crypto';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function getSecret(): string {
  return process.env.JWT_SECRET || 'polygon-dev-secret-change-me';
}

export function signToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + TOKEN_TTL_MS })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

export function verifyToken(token: string): { email: string } | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');

  if (signature !== expected) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      email: string;
      exp: number;
    };

    if (!data.email || data.exp < Date.now()) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}
