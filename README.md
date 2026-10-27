# Halloween AR Ghost Hunt

A mobile-first multiplayer marker-based AR game for a live Halloween event. The
authoritative requirements are in [`AGENTS.md`](./AGENTS.md).

## Current status

The first foundation slice is implemented:

- npm workspaces for the Next.js web app, Express API, and shared contracts
- strict TypeScript and workspace-wide lint, format, build, and test commands
- shared Zod payload schemas and the canonical 30 marker IDs
- validated marker and GLB manifests with asset-integrity tests
- SQLite startup with WAL, foreign keys, checksummed migrations, and the initial
  constrained schema
- `GET /api/health`, backed by a live SQLite query

Room creation, authentication, Socket.IO, match state, marker assets, AR, and
gameplay are not implemented yet.

## Start locally

Requires Node.js 22 or newer and npm 10 or newer.

```bash
npm install
cp .env.example .env
npm run migrate
npm run dev
```

The web app uses `http://localhost:3000` and the API uses
`http://localhost:3001`. Verify API readiness with:

```bash
curl http://localhost:3001/api/health
```

See [`docs/setup.md`](./docs/setup.md) for configuration and validation details.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm run validate:assets
npm test
npm run build
```

Asset findings and unresolved production gates are documented in
[`docs/marker-printing.md`](./docs/marker-printing.md) and
[`docs/model-assets.md`](./docs/model-assets.md).
