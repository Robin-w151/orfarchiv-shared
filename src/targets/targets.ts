export interface Target {
  readonly url: string;
  readonly label: string;
  readonly content: boolean;
}

export interface ContentExclusions {
  readonly targets: ReadonlyArray<Target>;
  readonly unknownLabels: ReadonlyArray<string>;
}

// Never split on ',' — replica-set URIs legally contain commas, e.g. mongodb://a:27017,b:27017/
const SEPARATOR = /\r?\n|;/;
const CREDENTIALS = /(mongodb(?:\+srv)?:\/\/)[^@/\s]+@/g;

export function parseTargets(raw: string): ReadonlyArray<Target> {
  return [...new Set(splitEntries(raw))].map((url) => ({ url, label: labelOf(url), content: true }));
}

export function withContentExclusions(targets: ReadonlyArray<Target>, rawExcluded: string): ContentExclusions {
  const excluded = new Set(splitEntries(rawExcluded));
  const labels = new Set(targets.map((target) => target.label));

  return {
    targets: targets.map((target) => (excluded.has(target.label) ? { ...target, content: false } : target)),
    unknownLabels: [...excluded].filter((label) => !labels.has(label)),
  };
}

export function labelOf(url: string): string {
  const withoutScheme = url.replace(/^[^:/]+:\/\//, '');
  const authority = withoutScheme.split(/[/?#]/, 1)[0];
  return authority.slice(authority.lastIndexOf('@') + 1);
}

export function redact(text: string): string {
  return text.replace(CREDENTIALS, '$1***@');
}

function splitEntries(raw: string): Array<string> {
  return raw
    .split(SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
