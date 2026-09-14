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

The files compile inside each consumer, so imports such as `mongodb` resolve against the consumer's own dependencies.
Keep this repo free of runtime dependencies and Effect imports.

## Development

```bash
npm ci
npm run lint
npm run test
```
