import { describe, expect, it } from 'vitest';
import { isEmbeddable, toContentDocumentInput } from './search';
import {
  CONTENT_EMBEDDING_DIMENSIONS,
  CONTENT_EMBEDDING_FIELD,
  CONTENT_STATUS,
  CONTENT_STATUS_FIELD,
  NEWS_TITLE_VECTOR_INDEX,
  TITLE_EMBEDDING_DIMENSIONS,
  TITLE_EMBEDDING_FIELD,
} from './search.constants';

describe('constants', () => {
  it('match the values stored in the database', () => {
    expect(NEWS_TITLE_VECTOR_INDEX).toBe('news_title_vector');
    expect(TITLE_EMBEDDING_FIELD).toBe('titleEmbedding');
    expect(TITLE_EMBEDDING_DIMENSIONS).toBe(256);
    expect(CONTENT_EMBEDDING_FIELD).toBe('contentEmbedding');
    expect(CONTENT_EMBEDDING_DIMENSIONS).toBe(512);
    expect(CONTENT_STATUS_FIELD).toBe('contentStatus');
    expect(CONTENT_STATUS).toEqual({ embedded: 'embedded', failed: 'failed' });
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

describe('toContentDocumentInput', () => {
  it('combines title and body in the document prompt format', () => {
    expect(toContentDocumentInput('Teuerung befeuert die Schwarzarbeit', 'Die hohe Inflation ...')).toBe(
      'title: Teuerung befeuert die Schwarzarbeit | text: Die hohe Inflation ...',
    );
  });
});
