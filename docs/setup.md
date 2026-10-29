# Setup and deployment

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- Python 3.9 or newer for regenerating the printable marker PDF
- a native build toolchain if npm cannot use a prebuilt `better-sqlite3`
  binary
- ngrok for a public event tunnel

Development has been exercised with Node.js 24.14.0 and npm 11.9.0. Those
versions are observations, not a claim that every newer release is compatible.

## Install and configure

From the repository root:

```bash
npm install
cp .env.example .env
npm run migrate
```

The web, API, and gateway processes all read the repository-root `.env`. The
default database path resolves to `apps/server/data/game.sqlite` because the
server workspace runs with `apps/server` as its working directory. `.env` and
database files are ignored by Git.

If `WEB_PORT` or `API_PORT` changes, update `WEB_TARGET` or `API_TARGET` to the
matching loopback port. Startup validates every configured port and proxy target.

## Recommended local/event topology

Start all three processes:

```bash
npm run dev
```

Open `http://localhost:8080`, not the upstream ports. The gateway presents one
origin and routes requests as follows:

| Public path                      | Upstream                    |
| -------------------------------- | --------------------------- |
| `/api`, `/api/*`, `/socket.io/*` | Express at `127.0.0.1:3001` |
| every other path                 | Next.js at `127.0.0.1:3000` |

WebSocket upgrades for Socket.IO use the same `/socket.io` route. Polling remains
available through the ordinary HTTP proxy. Next.js and Express bind to loopback;
only the gateway binds beyond the host by default.

Individual processes are available for diagnosis:

```bash
npm run dev:web
npm run dev:server
npm run dev:gateway
```

For a deliberately split-origin local session, start the API with
`PUBLIC_ORIGIN=http://localhost:3000` and build/start the web app with
`NEXT_PUBLIC_API_ORIGIN=http://localhost:3001`. The single-origin gateway is the
supported event configuration because it avoids cross-origin cookie and iOS
camera complications.

## Production build and ngrok

1. Start ngrok against the gateway port to obtain the assigned HTTPS origin:

   ```bash
   ngrok http 8080
   ```

2. Stop the local processes. Put the exact assigned origin in `.env`, with no
   trailing slash, and keep the browser API origin empty:

   ```dotenv
   NODE_ENV=production
   PUBLIC_ORIGIN=https://YOUR-ASSIGNED-NGROK-DOMAIN
   NEXT_PUBLIC_API_ORIGIN=
   ```

3. Build only after setting the public values. `NEXT_PUBLIC_*` values are
   embedded by Next.js at build time.

   ```bash
   npm run build
   npm run migrate
   npm run start
   ```

4. Open the ngrok HTTPS URL on the host and phones. Do not expose ports 3000 or
   3001 directly. The host computer must remain powered, awake, connected, and
   running all three services for the whole event.

If ngrok assigns a different origin, stop the processes, update `PUBLIC_ORIGIN`,
rebuild, and restart. The API enforces the configured origin; wildcard origins
are not enabled with credentials.

## Verification

Run the repository checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run validate:assets
npm test
npm run build
```

With the services running, verify the gateway rather than the private API port:

```bash
curl --fail --silent http://localhost:8080/api/health
```

A ready response includes `status: "ok"`, `database: "ready"`, and a
server-generated Unix epoch timestamp.

## Security and scope

- Host and player resume credentials are opaque, hashed at rest, and delivered
  in HTTP-only, SameSite=Lax cookies. Production cookies are also Secure.
- A room code is not a host credential. Keep the browser profile that created
  the room under the organizer's control.
- Never expose `.env`, `apps/server/data`, upstream ports, or host browser data.
- Marker detection is browser input, not cryptographic proof of physical
  proximity. This is suitable for a supervised casual event, not a tamper-proof
  competition.

The software checks are reproducible, but production readiness still depends on
the physical marker, licensed-model, and real-device checks listed in the
corresponding documents.
