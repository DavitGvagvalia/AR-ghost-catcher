# Authentication and lobby surface brief

Mode: Operate. Scope: `/login`, `/lobby`, and the room-creation state of `/host`.

Players need to enter two short values, recover an existing opaque session, and
understand whether they are connected and waiting. Hosts need to create a room,
share its public code, and see current attendance without exposing credentials.
The UI must remain narrow-phone first, touch-safe, explicit about errors, and
usable in dim event lighting.

## Direction contract

**THESIS:** Admission should feel like receiving a field pass for a live night
hunt, not signing into a generic SaaS account. Refuse the centered white auth card
and the marketing split-screen.

**OWN-WORLD:** Ink-black violet ground, bone-white type, safety-orange primary
actions, and cyan connection signals. Layered field-sheet surfaces use restrained
12–16px corners, fine lavender rules, large room-code numerals, and a single crisp
ghost-line mark.

**STORY:** Enter the public room code and a nickname, receive a private browser
session, then wait with the actual connected roster until the host starts the
hunt. The host creates the room and shares only the public code.

**FIRST VIEWPORT:** On a phone, the product name and compact ghost mark anchor the
top, the two-field join form occupies the middle, and connection/privacy guidance
sits below the primary action without scrolling. Desktop gives the form breathing
room but does not turn it into a marketing page.

**FORM:** Code-led Operate surface, first in the product's implementation order.
`seed: none (unavailable)`. The signature interaction is the room code resolving
into a live roster without exposing or re-entering the resume credential.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance
