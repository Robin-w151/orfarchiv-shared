import { Binary } from 'mongodb';

/**
 * Matryoshka truncation to TITLE_EMBEDDING_DIMENSIONS, then per-vector max-abs
 * scaling to int8. Cosine similarity is scale-invariant, so the scale factor
 * cancels and does not need to be stored — the whole step is lossless with
 * respect to ranking. Re-normalization after truncation is likewise a no-op
 * under cosine, but would be required under dotProduct.
 */
export function quantize(values: ReadonlyArray<number>): Binary {
  const maxAbs = values
    .filter((value) => !Number.isNaN(value))
    .reduce((max, value) => Math.max(max, Math.abs(value)), 0);

  const scale = maxAbs === 0 ? 0 : 127 / maxAbs;
  const quantized = Int8Array.from(values, (value) => Math.max(-127, Math.min(127, Math.round(value * scale))));
  return Binary.fromInt8Array(quantized);
}
