# Sonia Clarity Engine

Foundation for the Sonia Clarity Engine, built with Next.js App Router,
TypeScript, and Tailwind CSS.

## Setup

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

Available checks:

```bash
npm run lint
npm run build
```

## Project structure

The project intentionally keeps the initial structure small:

- `app/` — App Router routes, the root layout, global styles, and metadata.
- `public/` — static assets served from the site root.
- `next.config.ts` — Next.js configuration.
- `tsconfig.json` — TypeScript configuration with the `@/*` import alias.
- `eslint.config.mjs` — Next.js ESLint configuration.

As the implementation grows, route-local components and utilities should be
kept close to their route in private folders (for example, `app/_components/`)
or introduced as shared modules only when they have more than one consumer.

The Sonia experience, data integrations, analytics, and other feature
dependencies will be planned and added separately.

## Reference material and secrets

Private reference documents, screenshots, local environment files, and build
outputs are excluded from version control. Do not copy reference material into
the application or commit secrets.
