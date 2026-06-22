# @adrianhall/cloudflare-logger

> A small, synchronous, structured logging library for applications that run across
> tests, local development, browsers, and Cloudflare Workers.

> [!WARNING]
> This package is under active development. The core logger engine is implemented
> (phases 1–3); transports, React subpath, and full documentation are still being
> implemented.

## Status

Implementation is tracked in [`docs/ENG_SPEC.md`](./docs/ENG_SPEC.md), section 25
(Implementation Plan).

| Phase | Description                 | Status   |
| ----- | --------------------------- | -------- |
| 1     | Repository scaffold         | Complete |
| 2     | Core types and levels       | Complete |
| 3     | Logger engine               | Complete |
| 4     | Internal formatting helpers | Complete |
| 5     | Built-in transports         | Complete |
| 6     | Default config helper       | Complete |
| 7     | React subpath               | Complete |
| 8     | Package verification        | Pending  |
| 9     | Documentation completion    | Pending  |
| 10    | Release candidate           | Pending  |

## Development

```sh
npm install
npm run check   # format, lint, types, dist, pack
npm test        # run all Vitest projects
```

## License

[MIT](./LICENSE)
