# @adrianhall/cloudflare-logger

> A small, synchronous, structured logging library for applications that run across
> tests, local development, browsers, and Cloudflare Workers.

> [!WARNING]
> This package is under active development. The repository scaffold is in place
> (ENG_SPEC.md Phase 1); the logging engine, transports, React subpath, and
> documentation are still being implemented.

## Status

Implementation is tracked in [`docs/ENG_SPEC.md`](./docs/ENG_SPEC.md), section 25
(Implementation Plan).

| Phase | Description                 | Status      |
| ----- | --------------------------- | ----------- |
| 1     | Repository scaffold         | In progress |
| 2     | Core types and levels       | Pending     |
| 3     | Logger engine               | Pending     |
| 4     | Internal formatting helpers | Pending     |
| 5     | Built-in transports         | Pending     |
| 6     | Default config helper       | Pending     |
| 7     | React subpath               | Pending     |
| 8     | Package verification        | Pending     |
| 9     | Documentation completion    | Pending     |
| 10    | Release candidate           | Pending     |

## Development

```sh
npm install
npm run check   # format, lint, types, dist, pack
npm test        # run all Vitest projects
```

## License

[MIT](./LICENSE)
