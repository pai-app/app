# Pai

[![CI](https://github.com/pai-app/app/actions/workflows/ci.yml/badge.svg)](https://github.com/pai-app/app/actions/workflows/ci.yml)
[![Deploy](https://github.com/pai-app/app/actions/workflows/deploy.yml/badge.svg)](https://github.com/pai-app/app/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/pai-app/app/branch/main/graph/badge.svg)](https://codecov.io/gh/pai-app/app)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)

Personal finance app for **Pai** — an offline-first React SPA on Cloudflare
Workers, built on the fyre-db reactive store with bank-statement/email import
and auto-tagging.

## Tech stack

- **React + Vite** single-page app (TypeScript)
- **fyre-db** offline-first reactive store (`@fyre-db/core` / `plugins` / `plugins-ui`)
- **@pai-app/adapters** — bank statement & email parsers
- **Cloudflare Workers** backend + static assets (Wrangler)

## Development

```bash
npm install
npm run dev            # Vite dev server + Worker (wrangler)
npm run build          # type-check (tsc -b) + Vite build
npm run lint           # ESLint
npm test               # vitest
npm run test:coverage  # vitest with v8 coverage
```

## Architecture

Domain logic lives in per-tenant **services** (`src/services/*-service.ts`) that
own their fyre-db entities and expose UI-safe view-models; React binds via
`useServices()` + `useObservable`. Direct `fyredb`/repo access outside the
service layer is blocked by an ESLint rule.

## Testing

Unit tests run against a real in-memory `FyreDb` (`tests/helpers/test-fyredb.ts`),
so service behaviour is exercised with faithful `deriveId`/partitioning/queries.
Coverage targets the service/logic layer; UI components and the mail/parse
integration boundary are excluded from the coverage gate (see `vitest.config.ts`).
