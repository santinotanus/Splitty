import crypto from 'crypto';

type InvitePayload = {
  grupoId: string;
  inviterId: string;
  exp: number; // epoch seconds
};

function getSecret() {
  return process.env.INVITES_SECRET || 'dev-invites-secret';
}

export function signInviteToken(payload: InvitePayload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${encode(header)}.${encode(payload)}`;
  const hmac = crypto.createHmac('sha256', getSecret()).update(unsigned).digest('base64url');
  return `${unsigned}.${hmac}`;
}

export function verifyInviteToken(token: string): InvitePayload | null {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const unsigned = `${h}.${p}`;
    const expected = crypto.createHmac('sha256', getSecret()).update(unsigned).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(s))) return null;
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')) as InvitePayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}


