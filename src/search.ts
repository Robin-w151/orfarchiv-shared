export const NEWS_TITLE_VECTOR_INDEX = 'news_title_vector';
export const TITLE_EMBEDDING_FIELD = 'titleEmbedding';
export const TITLE_EMBEDDING_DIMENSIONS = 256;

export function isEmbeddable(title: string | undefined | null): title is string {
  return typeof title === 'string' && title.trim().length > 0;
}
