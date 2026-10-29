# Event operations

## Rehearsal checklist

Complete this rehearsal on the actual host computer and event network:

1. Finish the marker checks in `docs/marker-printing.md` and model rights/device
   gates in `docs/model-assets.md`.
2. Copy `.env.example` to `.env`; set the final ngrok HTTPS origin as described
   in `docs/setup.md` before building.
3. Run `npm install`, the full validation suite, `npm run migrate`, and
   `npm run build`.
4. Start `ngrok http 8080`, then `npm run start`.
5. Verify `https://YOUR-DOMAIN/api/health` and open `/host` in the organizer's
   browser profile.
6. Create a rehearsal room, join from at least two real phones on mobile data,
   start the game, contest one marker, finish an encounter, and wait through a
   cooldown.
7. Reconnect a player, allow the server deadline to expire, finalize from the
   host, and compare results on every device.
8. Run the iOS/Android and 30-minute thermal checks. Record device/browser
   versions and failures; do not infer them from desktop emulation.

## Opening the event

- Connect the host to power and disable automatic sleep for the event window.
- Confirm the final `.env`, database path, ngrok origin, and gateway health.
- Keep ports 3000 and 3001 private; share only the gateway's HTTPS URL.
- Create the room on the protected host browser. Share the room code with
  players, never browser cookies or host profile data.
- Keep the host dashboard visible. Its player roster, live leaderboard, marker
  ledger, server time, and room state are authoritative views from the API.
- Start only after players appear in the roster. Ordinary End Game is rejected
  until the server reaches `AWAITING_FINALIZATION`.

## Backup and restore

SQLite runs in WAL mode. For a file-system backup, stop all three services
cleanly first so no write is in progress, then copy the entire data directory:

```bash
mkdir -p backups
cp -R apps/server/data "backups/data-before-event"
```

Verify the copy contains `game.sqlite`; preserve any `-wal` and `-shm` files if
present. To restore, keep services stopped, move the current data directory to a
separate recovery location, copy the chosen backup back to
`apps/server/data`, and run `npm run migrate` before starting. Never merge files
from different backup times.

Take a second stopped-service backup after the event if the scores must be
retained. Database contents and backups must not be committed or publicly
served.

## Failure procedures

### Camera permission denied

Ask the player to allow camera access for the exact HTTPS site in browser/site
settings, close other apps using the camera, return to `/game`, and use the
visible retry/resume action. Do not award manual points for an unverified local
tap.

### Camera stops after backgrounding or lock

Return Safari/Chrome to the foreground and press **Resume camera**. iOS does not
guarantee camera operation while backgrounded or locked. If the stream cannot
restart, reload the same room in the same browser profile; the HTTP-only resume
cookie restores authoritative progress.

### Player network interruption

Keep the same browser profile and reload after connectivity returns. The client
requests a complete room/encounter snapshot. An abandoned or expired 60-second
lease releases its marker without points or cooldown.

### Public tunnel interruption

Do not create a second live room. Restore the same assigned ngrok domain if the
account supports it. If the origin must change, stop services, update
`PUBLIC_ORIGIN`, rebuild the web app, restart, and distribute the replacement
URL. Existing room/database state remains local, but cookies are scoped to the
old origin, so players may need to rejoin as new identities unless the original
origin is restored.

### Host UI interruption

Reopen `/host` in the same protected browser profile. The host credential is an
HTTP-only cookie; another profile or device cannot assume host control from the
room code. Preserve the original host profile throughout the event.

### Host computer failure

The game is unavailable until the same database and services are restored. Keep
the host powered and connected, and keep a stopped-service backup plus the
repository and `.env` available to the operator.

## Closing the event

After the server timer shows `AWAITING_FINALIZATION`, use **End Game** once and
confirm every device receives the final leaderboard. Save a stopped-service
backup if required, then stop the application and ngrok. Results are immutable
after finalization.
