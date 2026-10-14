export function isEmbeddable(title: string | undefined | null): title is string {
  return typeof title === 'string' && title.trim().length > 0;
}

export function toContentDocumentInput(title: string, body: string) {
  return `title: ${title} | text: ${body}`;
}
