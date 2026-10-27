# AGENTS.md — Halloween AR Ghost Hunt

## 1. Mission

Build a production-quality-for-event, mobile-first multiplayer Halloween augmented-reality web game. Players join a room, scan one of 30 **unique** printed AR markers, tap 3D ghosts to defeat them, and earn points equal to the ghost's required hit count. The host starts a 30-minute match and later reveals the final leaderboard.

This file is the authoritative project specification for AI coding agents. Implement incrementally, keep code understandable, and do not silently change game rules. If a rule is ambiguous, use the defaults in this file and document any assumption.

## 2. Required stack

- Next.js App Router, React, TypeScript (strict mode).
- Tailwind CSS for responsive UI.
- AR.js with A-Frame for marker-based WebAR. Keep the AR runtime client-only.
- Dedicated Node.js Express server with Socket.IO for authoritative game state and real-time communication.
- SQLite with `better-sqlite3` for local persistence. Enable WAL and foreign keys.
- Local development and event hosting; expose public HTTPS endpoints using ngrok.
- npm workspaces recommended; use a single repository.
- Do not add authentication providers, cloud databases, paid services, or unnecessary dependencies.

## 3. Core rules

1. There are exactly 30 unique marker IDs (`marker-01` through `marker-30`), each mapped to its own printable AR.js-compatible marker pattern.
2. Each marker has independent availability **per room**. A marker can have at most one active encounter in a room. It cannot be claimed again until its cooldown expires.
3. A player enters a nickname and room code at `/login`, then waits in `/lobby`.
4. The host controls the room from `/host`. Host authentication is mandatory; do not trust an arbitrary browser claiming to be the host.
5. The host starts a match; the authoritative server records `startedAt` and `endsAt = startedAt + 30 minutes`.
6. While the match is running, players scan markers. When an available marker is claimed, the server assigns a random ghost model and a random required number of successful hits.
7. The player taps the ghost to attack. Only server-validated hits count. On defeat, award points **once**, equal to the originally assigned required hit count, not to excess taps or retry attempts.
8. A defeated marker enters a **30-second cooldown** starting at the server-confirmed defeat time. The cooldown is shared among players in the same room.
9. At `endsAt`, the server immediately disables new encounters, attacks, and score changes; clients show an awaiting-results screen. The host may then press **End Game** to finalize and publish results.
10. After finalization, all players see the final leaderboard and winner(s). Ties for first place are co-winners; sort tied players deterministically by nickname and player ID for display.
11. Scores never depend on client clocks, client-reported damage, or client-reported point totals.

### Explicit MVP defaults (configurable)

- `MATCH_DURATION_MS = 1_800_000` (30 minutes).
- `MARKER_COOLDOWN_MS = 30_000`.
- `MIN_GHOST_HITS = 3`, `MAX_GHOST_HITS = 12`, inclusive.
- One active encounter per player.
- A marker remains reserved during an active encounter. If its owner disconnects, abandons it, or fails to finish within `ENCOUNTER_LEASE_MS = 60_000`, cancel the encounter and release the marker without awarding points or starting cooldown.
- The player may temporarily lose visual tracking; do not automatically cancel the encounter on a momentary loss. Pause local interaction while the marker is not visible and show a reacquisition prompt. The server lease still applies.
- New claims are blocked after the match deadline even if a marker is available. Unfinished encounters at the deadline end without points.
- Duplicate nicknames are allowed; identity is a server-issued player ID.
- A player can rejoin the same room using a stored, opaque resume credential. Do not let a nickname alone authorize a resume.
- Rooms are isolated: a marker cooldown in room A does not affect room B.
- A host can create a room and retrieve its room code and secret host credential; the room code alone must not grant host privileges.

## 4. Important AR marker constraint

The 30 markers MUST be distinct AR.js pattern markers, not 30 copies of one pattern. AR.js must resolve each pattern to its configured marker ID. Maintain an explicit, version-controlled marker manifest mapping IDs to pattern asset paths and printable artwork paths. Do not assume the browser can infer physical marker identity from identical images.

Generate or provide a reproducible workflow for 30 sufficiently distinguishable pattern markers. Test printed markers at realistic sizes, distances, angles, lighting, and with multiple markers visible. Avoid near-identical patterns. Include a printable PDF/contact sheet with ID labels and a calibration/test page. If automatic generation of valid `.patt` files is not reliable, stop and document the required marker-generation workflow rather than inventing invalid files.

Only one marker should drive the active local AR encounter at a time. When multiple markers are visible, select deterministically (e.g., most recently stable marker when no encounter is active) and prevent duplicate claims due to repeated detection events.

## 5. Camera and iOS requirements

- Camera is the primary gameplay view and should remain active while the game page is visible and the browser permits access.
- Camera must be requested through a user gesture (e.g., **Enter Hunt**); never claim iOS can bypass camera permission or autoplay restrictions.
- Serve the player site over HTTPS through ngrok, or localhost for local development. Camera access on insecure remote HTTP is not supported.
- Mount AR.js/A-Frame only on the client after hydration; guard `window`, `document`, and camera APIs.
- Configure mobile viewport, `playsinline`, appropriate video attributes, and compatible A-Frame/AR.js versions; test real iPhones in Safari.
- Handle permission denied, unsupported camera, camera already in use, app backgrounding, lock-screen interruptions, orientation changes, and camera stream restarts.
- When the page returns to foreground, detect a stopped camera stream and provide a clear **Resume Camera** action if needed.
- Never promise camera operation when iOS Safari is backgrounded or the device is locked.
- Avoid expensive per-frame React state updates; keep AR tracking and animation in the A-Frame/Three.js scene.
- Provide a fallback error screen and retry instructions; do not award points without valid server-side encounter state.

## 6. Repository structure

```text
/
  AGENTS.md
  package.json                 # npm workspaces and root scripts
  .env.example
  apps/
    web/
      app/
        login/page.tsx
        lobby/page.tsx
        game/page.tsx
        host/page.tsx
        results/page.tsx
      components/
        ar/
        game/
        host/
        ui/
      lib/
        socket.ts
        api.ts
        config.ts
      public/
        markers/
          patterns/
          printable/
        models/
          ghosts/
        audio/
      package.json
    server/
      src/
        index.ts
        config.ts
        db/
          connection.ts
          migrations/
          repositories/
        domain/
          game-engine.ts
          marker-service.ts
          encounter-service.ts
          scoring-service.ts
        http/
          routes/
          middleware/
        sockets/
          handlers.ts
          authorization.ts
        jobs/
          match-expiration.ts
        utils/
      data/                    # ignored local SQLite database
      package.json
  packages/
    shared/
      src/
        contracts.ts
        events.ts
        constants.ts
        schemas.ts
      package.json
  scripts/
    markers/
  tests/
    integration/
    e2e/
  docs/
    architecture.md
    setup.md
    marker-printing.md
    ios-test-plan.md
    event-operations.md
```

Use shared runtime validation schemas (e.g., Zod) for incoming API and socket payloads. Avoid circular dependencies. Separate domain logic from transport handlers and React components.

## 7. Routes and screens

### `/login`

- Nickname and room-code inputs, Join button, loading/error states.
- Validate and normalize room codes server-side; trim nickname, enforce length (2–24 characters), reject control characters and unsafe content.
- Save server-issued player session/resume token securely for reconnects.
- Redirect to `/lobby` after successful join.

### `/lobby`

- Room code, player nickname, connected player list/count, waiting status.
- Live updates when users join/leave and when host starts.
- On match start, navigate to `/game`.

### `/game`

- Full-viewport camera AR view, timer, score, ghost health/hits remaining, marker/encounter status, sound toggle, camera help.
- Show server-verified ghost model anchored to detected marker; ghost is tappable using mobile-friendly raycasting/pointer events.
- Hit feedback, ghost defeat animation, points gained, marker cooldown feedback.
- If another player holds the marker, show **Ghost being hunted**; if cooling down, show remaining cooldown.
- When time expires, stop gameplay immediately and show **Time is up — waiting for host**.
- Never reset the match or local identity on an ordinary page refresh.

### `/host`

- Protected host dashboard with create/select room, room code, player list, connection status, and server time.
- Start Game control (only from lobby), running match countdown, live leaderboard, marker status overview (30 markers), and End Game control (only after match deadline).
- Clearly distinguish `LOBBY`, `RUNNING`, `AWAITING_FINALIZATION`, and `FINISHED`.
- Show explicit errors for unauthorized or invalid transitions.
- Provide an optional protected emergency **Force End** action only if deliberately implemented; it must be separate from ordinary End Game and require confirmation.

### `/results`

- Final scores descending, rank, nicknames, top score, winner(s), and celebratory Halloween visuals.
- No gameplay mutations after results are published.
- On reconnect or refresh, fetch authoritative results.

## 8. Game state machine

```text
LOBBY --host.start--> RUNNING
RUNNING --server deadline--> AWAITING_FINALIZATION
AWAITING_FINALIZATION --host.end--> FINISHED
```

All transitions are validated and performed server-side. Do not use a browser timeout as the source of truth. Server restart must reconstruct deadlines from persisted timestamps and advance expired games before accepting new actions. Periodic server timers are only a convenience; every mutation must also verify the deadline.

Marker states (per room and marker):

```text
AVAILABLE --successful claim--> RESERVED
RESERVED --valid defeat--> COOLDOWN
RESERVED --abandon/lease expiry--> AVAILABLE
COOLDOWN --server cooldown expiry--> AVAILABLE
```

A marker reservation belongs to one encounter/player. Its state transitions must be atomic. On finalization, active reservations are invalidated and no new cooldown or points may be created.

## 9. Data model (SQLite)

Use migrations, parameterized queries, constraints, and indexed lookups. Suggested tables:

### `rooms`

- `id` TEXT PRIMARY KEY
- `code` TEXT UNIQUE NOT NULL
- `host_token_hash` TEXT NOT NULL
- `status` TEXT NOT NULL CHECK in allowed statuses
- `created_at` INTEGER NOT NULL
- `started_at` INTEGER NULL
- `ends_at` INTEGER NULL
- `finalized_at` INTEGER NULL

### `players`

- `id` TEXT PRIMARY KEY
- `room_id` TEXT NOT NULL REFERENCES rooms(id)
- `nickname` TEXT NOT NULL
- `resume_token_hash` TEXT NOT NULL
- `score` INTEGER NOT NULL DEFAULT 0 CHECK(score >= 0)
- `joined_at` INTEGER NOT NULL
- `last_seen_at` INTEGER NULL
- `is_connected` INTEGER NOT NULL DEFAULT 0

### `markers`

- `room_id` TEXT NOT NULL REFERENCES rooms(id)
- `marker_id` TEXT NOT NULL
- `active_encounter_id` TEXT NULL
- `cooldown_until` INTEGER NULL
- PRIMARY KEY (`room_id`, `marker_id`)

### `encounters`

- `id` TEXT PRIMARY KEY
- `room_id` TEXT NOT NULL REFERENCES rooms(id)
- `marker_id` TEXT NOT NULL
- `player_id` TEXT NOT NULL REFERENCES players(id)
- `ghost_model_id` TEXT NOT NULL
- `required_hits` INTEGER NOT NULL CHECK(required_hits > 0)
- `registered_hits` INTEGER NOT NULL DEFAULT 0
- `status` TEXT NOT NULL
- `claimed_at` INTEGER NOT NULL
- `lease_expires_at` INTEGER NOT NULL
- `completed_at` INTEGER NULL
- `awarded_points` INTEGER NOT NULL DEFAULT 0

### `score_events` (audit log)

- `id` TEXT PRIMARY KEY
- `room_id` TEXT NOT NULL
- `player_id` TEXT NOT NULL
- `encounter_id` TEXT NOT NULL UNIQUE
- `points` INTEGER NOT NULL
- `created_at` INTEGER NOT NULL

Add appropriate indexes on room/player, room/status, and encounter ownership. Validate that a marker ID is in the 30-item manifest. Prefer integer Unix epoch milliseconds for all timestamps. SQLite is the single source of truth; do not rely on process-memory state for durability.

## 10. HTTP API (suggested)

- `POST /api/rooms` — create room and issue host credential.
- `POST /api/rooms/:code/join` — join as player and issue player resume credential.
- `POST /api/rooms/:code/resume` — resume authenticated player session.
- `GET /api/rooms/:code/state` — room state scoped to authenticated caller.
- `POST /api/rooms/:code/start` — authenticated host starts match.
- `POST /api/rooms/:code/end` — authenticated host finalizes after deadline.
- `GET /api/rooms/:code/results` — finalized leaderboard (room access required).
- `GET /api/health` — readiness and DB check.

Use HTTP-only secure cookies where feasible, or carefully handled opaque credentials for cross-origin deployments. Never put host secrets into a public URL or bundle. Scope all requests and socket events to an authorized room and role.

## 11. Socket.IO contract

Use typed events and shared validation schemas. Suggested names:

**Client → server**

- `room:subscribe` (authenticated room join/resume)
- `marker:claim` `{ markerId, requestId }`
- `encounter:hit` `{ encounterId, attackId }`
- `encounter:abandon` `{ encounterId }`
- `room:sync` (request authoritative snapshot)

**Server → client**

- `room:state` — room status, authoritative timestamps, current players.
- `room:started` — `startedAt`, `endsAt`.
- `room:expired` — transition to awaiting finalization.
- `room:finished` — final results published.
- `marker:state` — marker availability/reservation/cooldown changes.
- `encounter:claimed` — encounter ID, ghost model, required hits, lease expiry.
- `encounter:hit-result` — authoritative registered hits and remaining hits.
- `encounter:defeated` — points awarded and cooldown deadline.
- `score:updated` — authoritative player score / leaderboard snapshot.
- `game:error` — structured, user-safe error code/message.

Authenticate socket connections on handshake and verify membership/ownership on every action. Do not allow clients to subscribe to unrelated rooms. On reconnect, send a complete snapshot, including active encounter (if any), marker cooldowns, score, and authoritative match deadline. Use acknowledgements and stable request/attack IDs for retries.

## 12. Concurrency, fairness, and abuse resistance

- Use `better-sqlite3` transactions for claim, hit, defeat, score update, and cooldown transitions.
- A marker claim must atomically check room status/deadline, marker availability, player eligibility, and absence of another active encounter; then reserve it.
- Two simultaneous claims must never create two successful encounters for the same marker.
- Validate encounter ownership and current status for every hit.
- Deduplicate hits using a persisted unique `(encounter_id, attack_id)` record or equivalent durable idempotency mechanism. Add a migration/table for this if needed.
- Enforce a sensible server-side minimum interval between accepted hits (configurable, e.g., 120 ms) to reduce scripted spam; tune for responsiveness on real phones.
- Only award points in the same transaction that completes the encounter; enforce uniqueness through `score_events.encounter_id`.
- Rate-limit room joins, marker claims, hits, and host actions. Validate payload sizes and strings.
- Client-side marker detection cannot be cryptographically verified by an ordinary browser. A determined attacker can spoof detection or API calls. This is a casual event game, not tamper-proof competitive infrastructure; document this limitation.
- Server may issue a short-lived claim challenge or require a short stable-detection interval on the client, but do not misrepresent this as proof of physical proximity.
- Use a single Node server process with SQLite for the event. Do not scale to multiple independent servers without revisiting locking, socket fanout, and deployment architecture.

## 13. Ghosts and 3D assets

- Implement at least 3 distinct lightweight low-poly ghost variants, ideally procedurally with A-Frame/Three.js primitives (body, eyes, mouth, simple decorations). If models are provided later, support `.glb`/`.gltf` files from `apps/web/public/models/ghosts/`.
- Maintain a ghost manifest with model ID, asset path or procedural generator, display scale, and optional animation settings.
- Randomize model and required hits **server-side at claim time**. Use a secure or reliable server RNG; never let the client select its own hit count.
- Models are visual only; they do not change scoring unless the rules are explicitly revised.
- Add idle floating, hit reaction, and defeat animation. Avoid expensive meshes, huge textures, and post-processing on mobile.
- Preload/cached assets where practical; render a lightweight fallback ghost if an optional model fails to load.
- Respect reduced-motion preferences and provide a mute option for sound.

## 14. Visual direction

Halloween atmosphere: near-black and deep purple backgrounds, orange highlights, ghostly cyan/lavender glows, readable high-contrast text, playful spooky graphics, and tactile mobile controls. Keep camera view unobstructed; overlay only essential HUD elements. Minimum comfortable touch targets ~44 CSS px. Design for narrow phones, safe-area insets, portrait-first use, and landscape resilience. Avoid UI that relies on hover.

## 15. Local networking and ngrok

- In development, Next.js and Express may run on separate localhost ports.
- For event deployment, prefer a **single public HTTPS origin**: reverse-proxy `/api` and `/socket.io` to Express and everything else to Next.js, or use a compatible single-origin gateway. This reduces cross-origin cookies, CORS, and iOS complications.
- Document exact local ports, proxy routes, public URLs, and startup commands in `docs/setup.md`.
- Configure Socket.IO transport and reverse proxy to support WebSocket upgrades; allow polling fallback.
- If using separate ngrok tunnels, configure exact CORS origins and credential handling explicitly; never use wildcard origins with credentials.
- Bind public origin via environment variables; do not hardcode ngrok hostnames.
- Verify the public URL on an actual iPhone and Android device on mobile data, not just the development machine.
- Never expose SQLite files, environment secrets, host credentials, or admin-only APIs publicly.
- The host computer must remain powered on and connected throughout the event. Provide backup/export instructions for the SQLite database.

### Example environment variables

```dotenv
NODE_ENV=development
WEB_PORT=3000
API_PORT=3001
PUBLIC_ORIGIN=https://YOUR-NGROK-DOMAIN
DATABASE_PATH=./data/game.sqlite
MATCH_DURATION_MS=1800000
MARKER_COOLDOWN_MS=30000
MIN_GHOST_HITS=3
MAX_GHOST_HITS=12
ENCOUNTER_LEASE_MS=60000
MIN_HIT_INTERVAL_MS=120
```

Never commit `.env` files or database contents. Provide `.env.example` with placeholders only.

## 16. Development sequence

Implement in vertical slices, each independently testable:

1. Initialize monorepo, strict TypeScript, lint/format scripts, shared schemas, Express health endpoint, SQLite migrations.
2. Room creation, protected host identity, player join/resume, lobby, Socket.IO room updates.
3. Match state machine, host start, persisted deadline, expiry/finalization, synchronized timers.
4. Marker manifest and 30 unique patterns; marker detection test page and printable assets.
5. Mobile camera AR scene and marker-driven procedural ghost rendering.
6. Atomic claim/reservation, server-selected ghost and hit count, hit validation, defeat, scoring, cooldown.
7. Reconnect recovery, multi-user contention, expiration edge cases, live leaderboard and results.
8. Halloween UI polish, audio, animations, performance and accessibility.
9. Real-device iOS/Android QA, ngrok deployment rehearsal, event operator documentation.

For every slice: state intended files, implement the smallest complete solution, run tests/typecheck/lint, and report actual results and remaining limitations. Never claim a feature works without testing it.

## 17. Testing and acceptance criteria

Automated unit/integration tests must cover:

- Room creation and authorized host actions; unauthorized host requests rejected.
- Join, nickname validation, room isolation, session resume.
- Exactly 30 valid unique marker IDs; unknown IDs rejected.
- Two players claiming one marker concurrently: exactly one succeeds.
- Two different markers can be claimed concurrently in the same room.
- A defeated marker blocks claims for 30 seconds, then becomes available.
- Reservation expiry/abandon releases a marker without cooldown or score.
- Required hits are within configured bounds; points equal required hits exactly.
- Duplicate/retried hits and duplicate defeat messages do not duplicate points.
- A player cannot hit another player's encounter.
- Deadline is enforced server-side even when scheduled timer is delayed.
- At deadline, unfinished encounters award no points; no further hits/claims accepted.
- End Game before deadline is rejected; after deadline it publishes results once.
- Tied top scores yield co-winners; leaderboard ordering is stable.
- Server restart restores match deadline, scores, cooldowns, and valid reservations.
- Disconnect/reconnect synchronizes authoritative state without resetting progress.

Manual device QA must cover:

- iOS Safari camera permission, active camera during foreground play, interruption/recovery.
- Android Chrome camera and touch interaction.
- Marker recognition on actual printed sheets in varied lighting/angles.
- Distinct identification of all 30 markers; no accidental pattern collisions.
- Multiple markers visible; no repeated unintended claims.
- 2+ real phones scanning the same marker simultaneously.
- Low-bandwidth network, brief disconnect, page reload, and ngrok reconnect.
- Host control, deadline transition, final leaderboard on all devices.
- Smooth ghost rendering and acceptable battery/thermal behavior during a 30-minute session.

## 18. Definition of done

The event organizer can start the local services, expose the game securely through ngrok, print and place 30 distinguishable markers, create a room, share its code, and host a 30-minute session. Multiple players can join from real iOS/Android phones, scan markers, see and defeat ghosts, receive exactly correct scores, respect independent shared marker cooldowns, survive reconnects, and see identical finalized results after the host ends the game. The project includes repeatable setup instructions, tests, and a documented operational fallback for camera/network failures.

## 19. Agent working rules

- Read this file before changing implementation. Treat it as requirements, not aspirational prose.
- Keep authoritative game rules in the server domain layer; React and AR scenes are presentation/input layers.
- Prefer clear typed modules and named functions over clever abstractions.
- Use explicit state machines, idempotency, atomic DB transactions, and consistent time units.
- Never invent an AR.js API or marker asset format; verify against installed package versions and test on device.
- Never introduce mock success paths in production flows or trust client-reported scores.
- Keep dependencies minimal, avoid `any`, use structured errors and input validation.
- Avoid sweeping refactors outside the current task.
- Update migrations, tests, `.env.example`, and docs whenever contracts or behavior change.
- Preserve accessibility, safe-area layout, and iOS camera recovery.
- When uncertain, identify the uncertainty, choose the smallest testable implementation, and record the decision.
