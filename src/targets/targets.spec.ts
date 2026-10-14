import { describe, expect, it } from 'vitest';
import { labelOf, parseTargets, redact, withContentExclusions } from './targets';

describe('parseTargets', () => {
  it('splits on newlines', () => {
    expect(parseTargets('mongodb://a:27017/\nmongodb://b:27017/').map((target) => target.url)).toEqual([
      'mongodb://a:27017/',
      'mongodb://b:27017/',
    ]);
  });

  it('splits on CRLF', () => {
    expect(parseTargets('mongodb://a/\r\nmongodb://b/').map((target) => target.url)).toEqual([
      'mongodb://a/',
      'mongodb://b/',
    ]);
  });

  it('splits on semicolons', () => {
    expect(parseTargets('mongodb://a/;mongodb://b/').map((target) => target.url)).toEqual([
      'mongodb://a/',
      'mongodb://b/',
    ]);
  });

  it('trims surrounding whitespace', () => {
    expect(parseTargets('  mongodb://a/ \n\tmongodb://b/\t').map((target) => target.url)).toEqual([
      'mongodb://a/',
      'mongodb://b/',
    ]);
  });

  it('skips blank entries', () => {
    expect(parseTargets('\n\nmongodb://a/;;  ;\n mongodb://b/\n').map((target) => target.url)).toEqual([
      'mongodb://a/',
      'mongodb://b/',
    ]);
  });

  it('drops duplicates and preserves order', () => {
    expect(parseTargets('mongodb://b/\nmongodb://a/\n mongodb://b/ ').map((target) => target.url)).toEqual([
      'mongodb://b/',
      'mongodb://a/',
    ]);
  });

  it('keeps replica-set URIs containing commas intact', () => {
    expect(parseTargets('mongodb://u:p@a:27017,b:27017,c:27017/?replicaSet=rs0;mongodb://d/')).toEqual([
      { url: 'mongodb://u:p@a:27017,b:27017,c:27017/?replicaSet=rs0', label: 'a:27017,b:27017,c:27017', content: true },
      { url: 'mongodb://d/', label: 'd', content: true },
    ]);
  });

  it('returns nothing for empty input', () => {
    expect(parseTargets('')).toEqual([]);
    expect(parseTargets(' \n ; ')).toEqual([]);
  });
});

describe('withContentExclusions', () => {
  const targets = parseTargets('mongodb://a/;mongodb://u:p@b:27017/;mongodb://c/');

  it('keeps content on every target without exclusions', () => {
    expect(withContentExclusions(targets, '')).toEqual({ targets, unknownLabels: [] });
    expect(withContentExclusions(targets, ' \n ; ').targets.map((target) => target.content)).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('disables content on excluded labels', () => {
    const { targets: result, unknownLabels } = withContentExclusions(targets, ' b:27017 ;c');
    expect(result.map(({ label, content }) => [label, content])).toEqual([
      ['a', true],
      ['b:27017', false],
      ['c', false],
    ]);
    expect(unknownLabels).toEqual([]);
  });

  it('returns excluded labels that match no target', () => {
    const { targets: result, unknownLabels } = withContentExclusions(targets, 'a;typo.mongodb.net\nb');
    expect(result.map((target) => target.content)).toEqual([false, true, true]);
    expect(unknownLabels).toEqual(['typo.mongodb.net', 'b']);
  });
});

describe('labelOf', () => {
  it.each([
    ['mongodb://user:pw@db.example.net:27017/?tls=true', 'db.example.net:27017'],
    ['mongodb+srv://user:pw@cluster0.xxx.mongodb.net/', 'cluster0.xxx.mongodb.net'],
    ['mongodb://localhost', 'localhost'],
    ['mongodb://localhost:27017/orfarchiv', 'localhost:27017'],
    ['mongodb://user@host:1234', 'host:1234'],
    ['mongodb://us%40er:p%40ss@host#fragment', 'host'],
    ['mongodb://a:27017,b:27017/db', 'a:27017,b:27017'],
  ])('%s -> %s', (url, expected) => {
    expect(labelOf(url)).toBe(expected);
  });

  it('never contains credentials', () => {
    const label = labelOf('mongodb://admin:s3cr3t@db.example.net:27017/');
    expect(label).not.toContain('admin');
    expect(label).not.toContain('s3cr3t');
  });
});

describe('redact', () => {
  it('strips credentials from a URI', () => {
    expect(redact('mongodb://admin:s3cr3t@db.example.net:27017/')).toBe('mongodb://***@db.example.net:27017/');
  });

  it('strips credentials from srv URIs', () => {
    expect(redact('mongodb+srv://admin:s3cr3t@cluster0.xxx.mongodb.net/')).toBe(
      'mongodb+srv://***@cluster0.xxx.mongodb.net/',
    );
  });

  it('strips credentials from every URI embedded in text', () => {
    const text = 'failed mongodb://a:x@h1/ and mongodb://b:y@h2:27017,h3:27017/';
    expect(redact(text)).toBe('failed mongodb://***@h1/ and mongodb://***@h2:27017,h3:27017/');
  });

  it('leaves URIs without credentials untouched', () => {
    expect(redact('mongodb://localhost:27017/')).toBe('mongodb://localhost:27017/');
  });
});
