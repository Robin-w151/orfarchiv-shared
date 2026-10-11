import { Effect } from 'effect';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { StoryContentError, StoryContentErrorReason, StoryContentService } from './storyContent';
import { ARTICLE_NOISE_SELECTORS, TEXT_NOISE_SELECTORS } from './storyContentConfig';

const fixtures = {
  regional: { file: 'regional-story.html', url: 'https://wien.orf.at/stories/3372176/' },
  storyText: { file: 'fm4-story-text.html', url: 'https://fm4.orf.at/stories/3049525/' },
  mosaik: { file: 'fm4-mosaik.html', url: 'https://fm4.orf.at/story/esc-trollbeitrag-100' },
  teaser: { file: 'news-teaser.html', url: 'https://orf.at/stories/3285623/' },
};

type Fixture = keyof typeof fixtures;

function readFixture(fixture: Fixture) {
  return readFileSync(new URL(`./fixtures/${fixtures[fixture].file}`, import.meta.url), 'utf8');
}

function run<A, E>(effect: Effect.Effect<A, E, StoryContentService>) {
  return Effect.runPromise(effect.pipe(Effect.provide(StoryContentService.layer)));
}

function extractArticleText(html: string, url: string) {
  return Effect.gen(function* () {
    const storyContentService = yield* StoryContentService;
    return yield* storyContentService.extractArticleText(html, url);
  });
}

function extractFixtureText(fixture: Fixture) {
  return run(extractArticleText(readFixture(fixture), fixtures[fixture].url));
}

function noiseTexts(fixture: Fixture, selectors: ReadonlyArray<string>) {
  const document = new JSDOM(readFixture(fixture)).window.document;
  return [...document.querySelectorAll(selectors.join(', '))]
    .map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean);
}

function paragraphs(text: string) {
  return text.split('\n\n');
}

function withArticleNoise(html: string) {
  return html.replace(
    '<div class="story-story">',
    `<div class="story-story">
      <section class="stripe"><p>Video stripe text</p></section>
      <p class="caption stripe-credits">Video stripe credits</p>
      <div class="embed migsys"><div class="migsys" data-mig-url="https://orf.at/chart"></div><p>Chart embed text</p></div>`,
  );
}

const htmlWithRelativeLinks = `<!doctype html>
<html>
  <head><title>Relative links</title></head>
  <body>
    <article>
      <h1>Relative links</h1>
      ${'<p>Ein Absatz mit genug Text, damit Readability den Artikel erkennt, und einem <a href="/stories/1234567/">relativen Link</a> sowie einem <a href="../other/">zweiten Link</a>.</p>'.repeat(8)}
    </article>
  </body>
</html>`;

describe('extractArticleText', () => {
  it('removes print warnings, video stripes, more to read, nav and charts from a regional story', async () => {
    const html = withArticleNoise(readFixture('regional'));
    const text = await run(extractArticleText(html, fixtures.regional.url));

    expect(text).toContain('Der Wohnbausektor steht unter Druck.');
    expect(text).not.toContain('Video stripe');
    expect(text).not.toContain('Chart embed text');
    const noise = noiseTexts('regional', [...ARTICLE_NOISE_SELECTORS, ...TEXT_NOISE_SELECTORS, 'nav']);
    expect(noise.length).toBeGreaterThan(0);
    for (const line of noise.filter((line) => line.length >= 20)) {
      expect(text).not.toContain(line);
    }
    for (const line of noise) {
      expect(paragraphs(text)).not.toContain(line);
    }
  });

  it('removes credits, meta, top links and audio players from a storyText story', async () => {
    const text = await extractFixtureText('storyText');

    expect(text).toContain('Es gibt aktuell kein Thema, das so stark polarisiert wie der Krieg in Gaza.');
    const noise = noiseTexts('storyText', TEXT_NOISE_SELECTORS);
    expect(noise.length).toBeGreaterThan(0);
    for (const line of noise) {
      expect(paragraphs(text)).not.toContain(line);
    }
  });

  it('removes image credits from a mosaik story', async () => {
    const text = await extractFixtureText('mosaik');

    expect(paragraphs(text)[0]).toBe('Humorbeiträge werden auf der Song-Contest-Bühne oft missverstanden');
    expect(paragraphs(text)).not.toContain('EBU');
  });

  it('returns the text of a teaser without following its link', async () => {
    const text = await extractFixtureText('teaser');

    expect(text).toBe(
      'Nach zwei Jahren ausschließlicher Präsenz als TV-Format in CoV-Zeiten kann das Brauchtumsfestival „Aufsteirern“ heute und morgen wieder in der Grazer Innenstadt stattfinden.\n\nMehr dazu in steiermark.ORF.at',
    );
  });

  it('separates paragraphs by blank lines and collapses whitespace', async () => {
    const text = await extractFixtureText('regional');

    for (const paragraph of paragraphs(text)) {
      expect(paragraph).not.toMatch(/\s{2,}|\n/);
      expect(paragraph).toBe(paragraph.trim());
      expect(paragraph).not.toBe('');
    }
  });

  it('separates lines split by line breaks', async () => {
    const html = htmlWithRelativeLinks.replace('<h1>', '<p>Land/Jahr: USA 2025<br>Regie: Tyree Dillihay</p><h1>');
    const text = await run(extractArticleText(html, 'https://orf.at/stories/1/'));

    expect(paragraphs(text)).toContain('Land/Jahr: USA 2025');
    expect(paragraphs(text)).toContain('Regie: Tyree Dillihay');
    expect(text).not.toContain('2025Regie');
  });

  it('returns identical text when called twice with the same input', async () => {
    for (const fixture of Object.keys(fixtures) as Fixture[]) {
      const html = readFixture(fixture);
      const first = await run(extractArticleText(html, fixtures[fixture].url));
      const second = await run(extractArticleText(html, fixtures[fixture].url));

      expect(second).toBe(first);
    }
  });

  it('fails with reason empty if readability finds nothing', async () => {
    const url = 'https://orf.at/stories/1/';
    const error = await run(Effect.flip(extractArticleText('<html><body></body></html>', url)));

    expect(error).toBeInstanceOf(StoryContentError);
    expect(error.reason).toBe(StoryContentErrorReason.Empty);
    expect(error.url).toBe(url);
  });

  it('fails with reason empty if only noise is left', async () => {
    const html = `<html><body><article><p class="print-warning">Druckversion</p><div class="embed migsys"><p>Grafik</p></div></article></body></html>`;
    const error = await run(Effect.flip(extractArticleText(html, 'https://orf.at/stories/1/')));

    expect(error.reason).toBe(StoryContentErrorReason.Empty);
  });
});

describe('extractArticle', () => {
  it('resolves relative links against the page url', async () => {
    const url = 'https://wien.orf.at/stories/3372176/';
    const article = await run(
      Effect.gen(function* () {
        const storyContentService = yield* StoryContentService;
        const document = yield* storyContentService.createStoryDocument(htmlWithRelativeLinks, url);
        yield* storyContentService.removeArticleNoise(document);
        return yield* storyContentService.extractArticle(document, url);
      }),
    );

    const hrefs = [...article.querySelectorAll('a')].map((anchor) => anchor.href);
    expect(hrefs.length).toBeGreaterThan(0);
    expect(new Set(hrefs)).toEqual(
      new Set(['https://wien.orf.at/stories/1234567/', 'https://wien.orf.at/stories/other/']),
    );
  });
});

describe('removeArticleNoise', () => {
  it('removes only the article noise selectors', async () => {
    const document = await run(
      Effect.gen(function* () {
        const storyContentService = yield* StoryContentService;
        const document = yield* storyContentService.createStoryDocument(readFixture('regional'), fixtures.regional.url);
        yield* storyContentService.removeArticleNoise(document);
        return document;
      }),
    );

    expect(document.querySelectorAll(ARTICLE_NOISE_SELECTORS.join(', '))).toHaveLength(0);
    expect(document.querySelector('.story-meta-dates')).not.toBeNull();
  });
});
