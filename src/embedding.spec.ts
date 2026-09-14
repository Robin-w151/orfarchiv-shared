import type { Binary } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { quantize } from './embedding';
import { TITLE_EMBEDDING_DIMENSIONS } from './search';

const VECTOR_HEADER_BYTES = 2;

function toInt8(binary: Binary): Int8Array {
  return new Int8Array(
    binary.buffer.buffer,
    binary.buffer.byteOffset + VECTOR_HEADER_BYTES,
    binary.length() - VECTOR_HEADER_BYTES,
  );
}

function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / Math.sqrt(na * nb);
}

/** Deterministic pseudo-random vector, so failures are reproducible. */
function randomVector(seed: number, length = 768): Array<number> {
  let state = seed;
  return Array.from({ length }, () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648 - 0.5;
  });
}

describe('quantize', () => {
  it('produces one int8 per dimension behind a 2-byte BSON vector header', () => {
    const binary = quantize(randomVector(1).slice(0, TITLE_EMBEDDING_DIMENSIONS));
    expect(binary.sub_type).toBe(9);
    expect(Array.from(binary.buffer.subarray(0, 2))).toEqual([3, 0]);
    expect(binary.length()).toBe(TITLE_EMBEDDING_DIMENSIONS + VECTOR_HEADER_BYTES);
    expect(toInt8(binary)).toHaveLength(TITLE_EMBEDDING_DIMENSIONS);
  });

  it('preserves cosine similarity within tolerance', () => {
    const a = randomVector(7).slice(0, TITLE_EMBEDDING_DIMENSIONS);
    const b = randomVector(9).slice(0, TITLE_EMBEDDING_DIMENSIONS);
    const exact = cosine(a, b);
    const quantized = cosine(toInt8(quantize(a)), toInt8(quantize(b)));
    expect(Math.abs(quantized - exact)).toBeLessThan(0.01);
  });

  it('is invariant to the scale of the input vector', () => {
    const values = randomVector(3).slice(0, TITLE_EMBEDDING_DIMENSIONS);
    expect(Array.from(toInt8(quantize(values)))).toEqual(
      Array.from(toInt8(quantize(values.map((value) => value * 42)))),
    );
  });

  it('keeps a vector maximally similar to itself', () => {
    const values = randomVector(5).slice(0, TITLE_EMBEDDING_DIMENSIONS);
    expect(cosine(toInt8(quantize(values)), toInt8(quantize(values)))).toBeCloseTo(1, 6);
  });

  it('survives an all-zero vector without producing NaN', () => {
    const binary = quantize(new Array(TITLE_EMBEDDING_DIMENSIONS).fill(0));
    expect(Array.from(toInt8(binary))).toEqual(new Array(TITLE_EMBEDDING_DIMENSIONS).fill(0));
  });

  it('uses the full int8 range for the largest component', () => {
    const values = randomVector(11).slice(0, TITLE_EMBEDDING_DIMENSIONS);
    expect(Math.max(...Array.from(toInt8(quantize(values))).map(Math.abs))).toBe(127);
  });

  it('clamps and rounds to the expected int8 values', () => {
    expect(Array.from(toInt8(quantize([1, -0.5, 0.25, 0, -1])))).toEqual([127, -63, 32, 0, -127]);
  });

  it('ignores NaN components when scaling', () => {
    expect(Array.from(toInt8(quantize([0.5, Number.NaN, -0.25])))).toEqual([127, 0, -63]);
  });
});
