# Architecture

## Runtime boundaries

- `apps/web` is the Next.js App Router client. It owns the mobile interface and
  mounts A-Frame/AR.js only after hydration and a user camera gesture.
- `apps/server` is the authoritative Express and Socket.IO process. It owns
  identity, room transitions, deadlines, encounter leases, accepted hits,
  cooldowns, scoring, and results.
- `apps/gateway` is the single-origin HTTP/WebSocket reverse proxy. It sends
  `/api` and `/socket.io` to Express and all other paths to Next.js.
- `packages/shared` contains runtime schemas, transport contracts, event names,
  constants, and marker/ghost manifests. It contains no database authority.
- SQLite is the durable source of truth. Browser and process-memory state are
  caches or presentation state only.

The event target is one gateway, one Next.js process, one API process, and one
SQLite database on a single host computer. Multiple independent API instances
are not supported because database locking and Socket.IO fanout have not been
designed for that topology.

## Identity and transport

Room creation issues an opaque host credential; joining issues an opaque player
resume credential. Only hashes are stored. HTTP-only SameSite cookies carry the
credentials, and every HTTP route and socket action rechecks the caller's room,
role, and encounter ownership. A room code alone grants no host capability.

The API accepts one exact `PUBLIC_ORIGIN`. The gateway keeps pages, cookies,
HTTP APIs, and Socket.IO on that origin. Shared Zod schemas validate incoming
room, marker, encounter, request, and attack identifiers.

## Authoritative state

The persisted room state machine is:

```text
LOBBY --host start--> RUNNING --server deadline--> AWAITING_FINALIZATION
AWAITING_FINALIZATION --host end--> FINISHED
```

Every claim and hit checks the persisted match deadline even if a scheduled
timer is late. On startup, expired rooms are advanced before requests are
accepted. The periodic expiration job is only a notification convenience.

Marker and encounter mutations run in `better-sqlite3` transactions. Claims
atomically check marker availability, the player's one-active-encounter limit,
and the room deadline. Request IDs and attack IDs are persisted for idempotent
retries. Defeat, score increment, score audit event, and cooldown creation occur
in one transaction, so an encounter can award points once only.

## Database initialization

`openDatabase` creates the parent directory, enables foreign keys, configures a
five-second busy timeout and WAL mode, and applies ordered migrations inside
transactions. Applied migrations store SHA-256 checksums; startup fails if an
applied migration changes or the database contains an unknown future version.

The schema includes durable claim idempotency, durable attack idempotency, a
unique score event per encounter, and a partial unique index limiting each
player to one active encounter.

## AR and presentation boundary

The client maps all 30 marker IDs to explicit `.patt` paths from
`MARKER_MANIFEST`. Stable visible markers are selected deterministically only
when no local encounter is active. Detection proposes a claim; it does not
select the ghost, hit requirement, accepted damage, points, or cooldown.

The server chooses a mobile-candidate ghost and hit requirement. Models are
visual-only and are normalized into marker-relative bounds at runtime. If a GLB
cannot load, the client renders a lightweight procedural fallback. Tracking
loss pauses local attacks and prompts reacquisition while the server lease keeps
running.

## Validation boundary

`npm run validate:assets` verifies manifest completeness, marker pattern
structure and uniqueness, and GLB structure/integrity. Automated server tests
exercise authorization, transitions, contention, idempotency, scoring,
deadlines, cooldowns, and restart persistence. Browser review covers the
single-origin HTTP/socket flow and camera lifecycle with a test-only media
device.

Those checks do not prove recognition of printed markers, mobile thermal
performance, or asset rights. The remaining physical and legal gates are
documented separately and must be recorded before the event.
