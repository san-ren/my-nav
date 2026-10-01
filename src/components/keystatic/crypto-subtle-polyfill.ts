/**
 * crypto.subtle.digest 兜底（仅后台使用）
 *
 * 背景：Web Crypto 的 crypto.subtle 只在「安全上下文」可用 ——
 * https 或 http://localhost 没问题，但用 http://192.168.x.x 这类局域网 IP 访问时
 * crypto.subtle 会是 undefined。而 Keystatic 后台在浏览器端依赖它计算摘要：
 *   - SHA-1   → git blob sha（内容指纹 / 变更检测）
 *   - SHA-256 → Keystatic Cloud 登录的 PKCE code_challenge
 * 缺失时集合页直接抛 "Cannot read properties of undefined (reading 'digest')"，
 * 页面表现为 "Unable to load collection"。
 *
 * 本模块只在 crypto.subtle 缺失时，向其注入一个纯 JS 的 digest 实现；
 * 安全上下文（https / localhost）下原生实现可用，此处不做任何事。
 *
 * 注：浏览器端 Keystatic 只用到 subtle.digest
 * （importKey / deriveKey / encrypt / decrypt 仅存在于服务端 bundle，不在此范围）。
 */

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

/** SHA-1（FIPS 180-4），返回 20 字节 */
function sha1(bytes: Uint8Array): Uint8Array {
  const ml = bytes.length;
  const paddedLength = ml + 1 + ((56 - ((ml + 1) % 64) + 64) % 64) + 8;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[ml] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(ml / 0x20000000));
  view.setUint32(paddedLength - 4, (ml << 3) >>> 0);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 80; i++) {
      const n = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16];
      w[i] = (n << 1) | (n >>> 31);
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const tmp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = tmp;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }

  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0); outView.setUint32(4, h1); outView.setUint32(8, h2);
  outView.setUint32(12, h3); outView.setUint32(16, h4);
  return out;
}

/** SHA-256（FIPS 180-4），返回 32 字节 */
function sha256(bytes: Uint8Array): Uint8Array {
  const ml = bytes.length;
  const paddedLength = ml + 1 + ((56 - ((ml + 1) % 64) + 64) % 64) + 8;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[ml] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(ml / 0x20000000));
  view.setUint32(paddedLength - 4, (ml << 3) >>> 0);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K256[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, h[i]);
  return out;
}

/** 与 WebCrypto 一致的裁切，避免返回超长 buffer */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function digest(algorithm: AlgorithmIdentifier | string, data: BufferSource): Promise<ArrayBuffer> {
  const rawName = typeof algorithm === 'string' ? algorithm : ((algorithm as any)?.name ?? '');
  const name = String(rawName).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const bytes = data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : ArrayBuffer.isView(data)
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : new Uint8Array(data as ArrayBuffer);

  if (name === 'SHA1') return toArrayBuffer(sha1(bytes));
  if (name === 'SHA256') return toArrayBuffer(sha256(bytes));
  throw new Error(`crypto.subtle polyfill: unsupported algorithm "${String(rawName)}"`);
}

export function installCryptoSubtlePolyfill() {
  if (typeof crypto === 'undefined') return;
  // 安全上下文（https / localhost）：原生可用，保持不动
  if (typeof (crypto as Crypto).subtle !== 'undefined') return;

  try {
    Object.defineProperty(crypto, 'subtle', {
      value: { digest },
      configurable: true,
    });
    console.info(
      '[MyNav] 当前为非安全上下文（http + 非 localhost），已为 Keystatic 后台注入 crypto.subtle.digest 兜底实现；' +
      '建议改用 http://localhost:<port>/keystatic 或 https 访问以获得原生加密能力。'
    );
  } catch (error) {
    console.warn('[MyNav] crypto.subtle 兜底注入失败：', error);
  }
}

installCryptoSubtlePolyfill();
