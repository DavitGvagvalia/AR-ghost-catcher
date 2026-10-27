# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Players at a live Halloween event use personal iOS or Android phones to join a
  room, scan printed markers, and defeat AR ghosts.
- One trusted event host creates and controls each room from the host computer or
  another browser with a secret host credential.
- The event organizer prints and places markers, operates the local services and
  HTTPS tunnel, and handles camera or network fallbacks.

## Product Purpose

Run a 30-minute, room-isolated multiplayer ghost hunt in which the server—not the
browser—owns match time, encounters, hits, cooldowns, scoring, and final results.
Success means multiple real phones can complete the event with identical,
recoverable authoritative state.

## Positioning

Physical marker discovery drives a shared room-specific game state: the same
printed marker can be contested by players in one room without affecting another
room, while every score mutation remains server-validated and auditable.

## Operating Context

The product runs locally at an event on one Node.js process and SQLite database,
exposed through HTTPS with ngrok. Players use mobile Safari or Chrome in varied
lighting and network conditions. The host computer must stay powered and online.

## Capabilities and Constraints

- Exactly 30 unique AR.js pattern markers, `marker-01` through `marker-30`.
- Next.js App Router, React, strict TypeScript, Tailwind CSS, AR.js/A-Frame,
  Express, Socket.IO, and `better-sqlite3` are required.
- Hosts and players use opaque server-issued credentials; room codes and
  nicknames alone never authorize privileged or resumed sessions.
- Match duration, encounter leases, hit bounds, hit interval, and cooldowns use
  the authoritative defaults and state machine in `AGENTS.md`.
- Camera permission requires a user gesture and foreground browser operation.
- Casual-event abuse resistance is required; browser marker detection cannot be
  represented as cryptographic proof of physical proximity.
- Marker print recognition, model scale, model rights, and real-device model
  performance remain open validation gates documented under `docs/`.

## Brand Commitments

The product name is Halloween AR Ghost Hunt. The confirmed atmosphere uses
near-black and deep purple, orange highlights, ghostly cyan/lavender light,
readable high-contrast copy, playful spooky details, tactile mobile controls, and
an unobstructed camera view. It must remain portrait-first and usable without
hover.

## Evidence on Hand

- Authoritative requirements: `AGENTS.md`.
- Thirty paired marker patterns and printable JPEGs under
  `apps/web/public/markers/`, with automated structural and integrity checks.
- Six GLB assets under `apps/web/public/models/ghosts/`, with technical audit and
  embedded provenance recorded in `docs/model-assets.md`.
- No testimonials, event results, deployment proof, physical marker test results,
  or third-party rights approvals exist and none may be fabricated.

## Product Principles

1. Server authority beats client convenience for every game mutation.
2. Reconnects preserve identity and progress through opaque credentials.
3. Mobile interaction stays legible, tactile, and camera-first under event stress.
4. Operational limitations and untested claims remain explicit.
5. Every slice is independently reproducible before the next one depends on it.

## Accessibility & Inclusion

Controls target at least 44 CSS pixels, all states need text as well as color,
keyboard focus remains visible, motion respects reduced-motion preferences, and
sound is optional. Duplicate nicknames are allowed and displayed with stable
server identities where disambiguation is necessary.
