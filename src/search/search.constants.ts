export const NEWS_TITLE_VECTOR_INDEX = 'news_title_vector';
export const TITLE_EMBEDDING_FIELD = 'titleEmbedding';
export const TITLE_EMBEDDING_DIMENSIONS = 256;
export const CONTENT_EMBEDDING_FIELD = 'contentEmbedding';
export const CONTENT_EMBEDDING_DIMENSIONS = 512;
export const CONTENT_STATUS_FIELD = 'contentStatus';

export const CONTENT_STATUS = {
  embedded: 'embedded',
  failed: 'failed',
} as const;
export type ContentStatus = (typeof CONTENT_STATUS)[keyof typeof CONTENT_STATUS];
