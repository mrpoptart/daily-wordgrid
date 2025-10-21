import { createHash } from "node:crypto";

export interface PRNG {
  nextUint32(): number; // unsigned 32-bit
  next(): number; // [0, 1)
  nextInt(boundExclusive: number): number; // 0..boundExclusive-1
}

function rotl32(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

function seedFromString(input: string): Uint32Array {
  const hash = createHash("sha256").update(input).digest();
  const state = new Uint32Array(4);
  for (let i = 0; i < 4; i++) {
    const o = i * 4;
    const v =
      ((hash[o] << 24) | (hash[o + 1] << 16) | (hash[o + 2] << 8) | hash[o + 3]) >>> 0;
    state[i] = v >>> 0;
  }
  // Ensure not all zeros
  if ((state[0] | state[1] | state[2] | state[3]) === 0) {
    state[0] = 0x9e3779b9;
    state[1] = 0x243f6a88;
    state[2] = 0xb7e15162;
    state[3] = 0x8aed2a6b;
  }
  return state;
}

export function createPrng(seed: string): PRNG {
  // xoshiro128** with 4x uint32 state
  let s0: number, s1: number, s2: number, s3: number;
  {
    const st = seedFromString(seed);
    s0 = st[0];
    s1 = st[1];
    s2 = st[2];
    s3 = st[3];
  }

  function nextUint32(): number {
    const result = Math.imul(rotl32(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0;

    const t = (s1 << 9) >>> 0;

    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = rotl32(s3, 11);

    return result >>> 0;
  }

  function next(): number {
    // divide by 2^32 to produce [0,1)
    return nextUint32() / 0x1_0000_0000;
  }

  function nextInt(boundExclusive: number): number {
    if (!Number.isFinite(boundExclusive) || boundExclusive <= 0) {
      throw new Error("boundExclusive must be a positive finite number");
    }
    // rejection sampling for unbiased result when bound not power of two
    const bound = boundExclusive >>> 0;
    const threshold = (0x1_0000_0000 - (0x1_0000_0000 % bound)) >>> 0;
    while (true) {
      const r = nextUint32();
      if (r < threshold) return r % bound;
    }
  }

  return { nextUint32, next, nextInt };
}
