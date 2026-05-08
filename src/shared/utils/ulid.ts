const ENC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(now: number, len: number): string {
  let str = '';
  let value = now;
  for (let i = len - 1; i >= 0; i--) {
    const mod = value % 32;
    str = ENC.charAt(mod) + str;
    value = (value - mod) / 32;
  }
  return str;
}

function encodeRandom(len: number): string {
  let str = '';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) {
    str += ENC.charAt(bytes[i] % 32);
  }
  return str;
}

export function ulid(now: number = Date.now()): string {
  return encodeTime(now, 10) + encodeRandom(16);
}

export function shortId(prefix = ''): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${t}${r}` : `${t}${r}`;
}
