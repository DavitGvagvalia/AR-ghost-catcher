# Local setup

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- A supported native build environment if npm cannot use a prebuilt
  `better-sqlite3` binary

The repository was initialized using Node.js 24.14.0 and npm 11.9.0. These are
observed development versions, not a promise that the event deployment has been
validated on every later Node release.

## Install and configure

From the repository root:

```bash
npm install
cp .env.example .env
npm run migrate
```

The API reads the repository-root `.env` file. Defaults create the database at
`apps/server/data/game.sqlite` because npm runs the server workspace with
`apps/server` as its working directory. Database files and `.env` are ignored by
Git.

## Run

Start the web and API processes together:

```bash
npm run dev
```

Or run them in separate terminals:

```bash
npm run dev:web
npm run dev:server
```

Current local endpoints:

| Service | URL                     | Notes                    |
| ------- | ----------------------- | ------------------------ |
| Next.js | `http://localhost:3000` | UI shell only in slice 1 |
| Express | `http://localhost:3001` | `GET /api/health`        |

`API_PORT` is read from the root `.env`. The web script defaults to port 3000;
to override it in this slice, export `WEB_PORT` in the shell before starting the
web workspace.

## Reproduce the foundation checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm run validate:assets
npm test
npm run build
```

For a manual readiness check:

```bash
curl --fail --silent http://localhost:3001/api/health
```

A successful response contains `status: "ok"`, `database: "ready"`, and a
server-generated Unix epoch timestamp. The automated health test starts the app
on an ephemeral local port and checks the same contract.

## Not yet available

There is no ngrok or single-origin proxy setup yet. Do not expose this slice as
an event-ready service: authentication, CORS, rate limiting, Socket.IO, and the
gameplay APIs are still pending.
