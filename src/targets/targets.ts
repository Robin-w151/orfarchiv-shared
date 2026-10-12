export interface Target {
  readonly url: string;
  readonly label: string;
}

// Never split on ',' — replica-set URIs legally contain commas, e.g. mongodb://a:27017,b:27017/
const SEPARATOR = /\r?\n|;/;
const CREDENTIALS = /(mongodb(?:\+srv)?:\/\/)[^@/\s]+@/g;

export function parseTargets(raw: string): ReadonlyArray<Target> {
  const urls = raw
    .split(SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return [...new Set(urls)].map((url) => ({ url, label: labelOf(url) }));
}

export function labelOf(url: string): string {
  const withoutScheme = url.replace(/^[^:/]+:\/\//, '');
  const authority = withoutScheme.split(/[/?#]/, 1)[0];
  return authority.slice(authority.lastIndexOf('@') + 1);
}

export function redact(text: string): string {
  return text.replace(CREDENTIALS, '$1***@');
}
