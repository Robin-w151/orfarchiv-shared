import { Readability } from '@mozilla/readability';
import { Context, Data, Effect, Layer } from 'effect';
import { JSDOM } from 'jsdom';
import {
  ALLOWED_CLASSES,
  ARTICLE_NOISE_SELECTORS,
  CHART_SELECTOR,
  TEXT_BLOCK_SELECTOR,
  TEXT_NOISE_SELECTORS,
} from './storyContent.constants';

export const StoryContentErrorReason = {
  Empty: 'empty',
  Parse: 'parse',
} as const;
export type StoryContentErrorReason = (typeof StoryContentErrorReason)[keyof typeof StoryContentErrorReason];

export class StoryContentError extends Data.TaggedError('StoryContentError')<{
  url: string;
  reason: StoryContentErrorReason;
  message: string;
  cause?: unknown;
}> {}

export class StoryContentService extends Context.Service<StoryContentService>()('shared/StoryContentService', {
  make: Effect.succeed({ createStoryDocument, removeArticleNoise, extractArticle, extractArticleText }),
}) {
  static readonly layerWithoutDependencies = Layer.effect(this, this.make);
  static readonly layer = this.layerWithoutDependencies;
}

function createStoryDocument(html: string, url: string) {
  return Effect.try({
    try: () => new JSDOM(html, { url }).window.document,
    catch: (cause) =>
      new StoryContentError({
        url,
        reason: StoryContentErrorReason.Parse,
        message: `Failed to parse content from url='${url}'`,
        cause,
      }),
  });
}

function removeArticleNoise(document: Document) {
  return Effect.sync(() => removeElements(document, ARTICLE_NOISE_SELECTORS));
}

function extractArticle(document: Document, url: string) {
  return Effect.gen(function* () {
    const article = yield* Effect.try({
      try: () => new Readability(document, { classesToPreserve: ALLOWED_CLASSES }).parse(),
      catch: (cause) =>
        new StoryContentError({
          url,
          reason: StoryContentErrorReason.Parse,
          message: `Failed to extract article from url='${url}'`,
          cause,
        }),
    });

    if (!article?.content) {
      return yield* new StoryContentError({
        url,
        reason: StoryContentErrorReason.Empty,
        message: `Optimized content from url='${url}' is empty`,
      });
    }

    return yield* createStoryDocument(article.content, url);
  });
}

function extractArticleText(html: string, url: string) {
  return Effect.gen(function* () {
    const document = yield* createStoryDocument(html, url);
    yield* removeArticleNoise(document);
    removeElements(document, [...TEXT_NOISE_SELECTORS, CHART_SELECTOR]);

    const article = yield* extractArticle(document, url);
    removeElements(article, ['nav']);

    const text = toText(article);
    if (!text) {
      return yield* new StoryContentError({
        url,
        reason: StoryContentErrorReason.Empty,
        message: `Article text from url='${url}' is empty`,
      });
    }

    return text;
  });
}

function removeElements(document: Document, selectors: ReadonlyArray<string>) {
  for (const element of document.querySelectorAll(selectors.join(', '))) {
    element.remove();
  }
}

function toText(document: Document) {
  for (const block of document.querySelectorAll(TEXT_BLOCK_SELECTOR)) {
    block.append('\n');
  }

  for (const lineBreak of document.querySelectorAll('br')) {
    lineBreak.replaceWith('\n');
  }

  return (document.body.textContent ?? '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}
