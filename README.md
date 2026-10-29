# Halloween AR Ghost Hunt

A mobile-first multiplayer marker-based AR game for a live Halloween event. The
authoritative requirements are in [`AGENTS.md`](./AGENTS.md).

## Implemented

- Next.js player and host interfaces with HTTP-only resume credentials
- Express, Socket.IO, and SQLite authoritative room, deadline, encounter,
  cooldown, score, and results state
- atomic marker claims, durable hit idempotency, rate limits, and restart
  recovery
- 30 unique AR.js pattern markers with an explicit manifest and camera-only
  recognition page at `/marker-test`
- client-only A-Frame/AR.js camera runtime, server-selected GLB ghosts,
  tracking-loss recovery, acknowledged-hit feedback, and procedural fallback
- single-origin HTTP/WebSocket gateway for local use and an ngrok HTTPS tunnel
- printable A4 marker pack with labels, placement sheets, calibration bar, and
  closest-pair test page
- automated schema, asset, HTTP, Socket.IO, concurrency, deadline, scoring, and
  persistence tests

## Start locally

Requires Node.js 22 or newer and npm 10 or newer.

```bash
npm install
cp .env.example .env
npm run migrate
npm run dev
```

Open `http://localhost:8080`. The gateway keeps the browser, `/api`, and
`/socket.io` on one origin while proxying to the private Next.js and Express
ports. Verify readiness through the same origin:

```bash
curl --fail http://localhost:8080/api/health
```

See [`docs/setup.md`](./docs/setup.md) for production builds and the exact ngrok
sequence. See [`docs/event-operations.md`](./docs/event-operations.md) for
rehearsal, backup, recovery, and event shutdown procedures.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm run validate:assets
npm test
npm run build
```

## Remaining event gates

The software and generated assets are reproducibly testable, but event readiness
is not proven until the organizer completes the real-device and physical checks:

- recognize every printed marker on target iPhones and Android phones;
- test `marker-16` and `marker-18` together, multiple markers in view, and
  simultaneous two-phone claims;
- rehearse camera interruption, network recovery, the final ngrok origin, and a
  continuous 30-minute match;
- review the supplied GLB rights and audience suitability before public use.

Use [`docs/marker-printing.md`](./docs/marker-printing.md),
[`docs/ios-test-plan.md`](./docs/ios-test-plan.md), and
[`docs/model-assets.md`](./docs/model-assets.md) as the evidence checklists. Do
not replace those physical and legal gates with desktop emulation.
