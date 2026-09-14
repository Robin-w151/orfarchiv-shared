import { describe, expect, it } from 'vitest';
import { isEmbeddable, NEWS_TITLE_VECTOR_INDEX, TITLE_EMBEDDING_DIMENSIONS, TITLE_EMBEDDING_FIELD } from './search';

describe('constants', () => {
  it('match the values stored in the database', () => {
    expect(NEWS_TITLE_VECTOR_INDEX).toBe('news_title_vector');
    expect(TITLE_EMBEDDING_FIELD).toBe('titleEmbedding');
    expect(TITLE_EMBEDDING_DIMENSIONS).toBe(256);
  });
});

describe('isEmbeddable', () => {
  it.each([
    ['a real title', 'Teuerung befeuert die Schwarzarbeit', true],
    ['an empty string', '', false],
    ['whitespace only', '   ', false],
    ['a tab', '\t', false],
    ['undefined', undefined, false],
    ['null', null, false],
  ])('%s -> %s', (_label, title, expected) => {
    expect(isEmbeddable(title as string | undefined | null)).toBe(expected);
  });
});
