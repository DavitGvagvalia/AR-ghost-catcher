# Architecture

## Boundaries

- `apps/web` is the Next.js App Router client. AR.js/A-Frame will be added as a
  client-only runtime in a later slice.
- `apps/server` is the authoritative Express process. It owns persistence,
  deadlines, encounter state, hit validation, and scoring.
- `packages/shared` contains transport-safe contracts, event names, constants,
  and Zod schemas. It contains no database or browser code.
- SQLite is the durable source of truth. Process memory must not become the
  authority for room or game state.

The event deployment target is one Node server process with SQLite. A later
deployment slice will add a single-origin HTTPS gateway for Next.js, `/api`, and
`/socket.io`; that gateway does not exist in the current foundation slice.

## Database initialization

`openDatabase` performs the following sequence for every connection:

1. Create the parent data directory when needed.
2. Enable SQLite foreign-key enforcement.
3. Set a 5-second busy timeout.
4. Request WAL journal mode.
5. Apply ordered migrations transactionally.

Applied migrations store a SHA-256 checksum. Startup fails if an already-applied
migration was edited or if the database contains a migration version unknown to
the running code. New schema changes must therefore be added as new migrations.

The initial schema includes `encounter_hits` for durable attack idempotency and
a partial unique index that limits each player to one `ACTIVE` encounter. The
encounter status names are internal persistence states; game transition behavior
will be implemented and tested in the gameplay slices.

## Confirmed limitations

Only the foundation slice is present. In particular, there is currently no host
or player authentication, room API, Socket.IO authorization, gameplay domain
logic, CORS policy, rate limiting, reverse proxy, AR runtime, or production
HTTPS/ngrok configuration. The health route is intentionally the only API route.
