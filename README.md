# orfarchiv-shared

Constants and functions shared by [orfarchiv-db](https://github.com/Robin-w151/orfarchiv-db),
[orfarchiv-scraper](https://github.com/Robin-w151/orfarchiv-scraper) and
[orfarchiv-ui](https://github.com/Robin-w151/orfarchiv-ui).

Consumed as a git submodule of source, not as an npm package:

| Repo      | Path                     |
| --------- | ------------------------ |
| `db`      | `src/shared/common/`     |
| `scraper` | `src/shared/common/`     |
| `ui`      | `src/lib/shared/common/` |

The files compile inside each consumer, so imports such as `mongodb` or `effect` resolve against the consumer's own dependencies.
Keep this repo free of runtime `dependencies`. Packages that shared code imports are `devDependencies` here, for linting
and tests, pinned to the versions the consumers use. `effect`, `jsdom` and `@mozilla/readability` are also listed as
`peerDependencies`.

`storyContent/` (ORF article extraction) imports `effect`, `jsdom` and `@mozilla/readability`. It is used by `ui` and
`scraper` only, so `db` excludes it from type checking.

## Development

```bash
npm ci
npm run lint
npm run test
```
